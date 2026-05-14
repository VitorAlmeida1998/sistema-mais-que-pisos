from datetime import date
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.usuario import Usuario
from app.repositories.atividade import AtividadeRepository
from app.repositories.instalador import InstaladorRepository
from app.repositories.pagamento import PagamentoRepository
from app.schemas.atividade import AtividadeResponse
from app.schemas.pagamento import RelatorioSemanalResponse, PagamentoResponse
from app.utils.auth import get_current_user

router = APIRouter(prefix="/relatorios", tags=["relatorios"])


class RelatorioInstaladorResponse(BaseModel):
    instalador_id: int
    instalador_nome: str
    instalador_cpf: str
    chave_pix: str | None
    periodo_inicio: date | None
    periodo_fim: date | None
    total_bruto: Decimal
    total_adiantamentos: Decimal
    total_liquido: Decimal
    total_atividades: int
    atividades: list[AtividadeResponse]
    pagamentos: list[PagamentoResponse]


@router.get("/semanal", response_model=RelatorioSemanalResponse)
def relatorio_semanal(
    inicio: date = Query(...),
    fim: date = Query(...),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> RelatorioSemanalResponse:
    repo = PagamentoRepository(db)
    pagamentos = repo.list_by_periodo(inicio, fim)

    instaladores_ids = set(p.instalador_id for p in pagamentos)
    total_bruto = sum((p.valor_bruto for p in pagamentos), Decimal("0"))
    total_adiantamentos = sum((p.valor_adiantamentos for p in pagamentos), Decimal("0"))
    total_liquido = sum((p.valor_liquido for p in pagamentos), Decimal("0"))

    pag_responses = []
    for p in pagamentos:
        r = PagamentoResponse.model_validate(p)
        if p.instalador:
            r.instalador_nome = p.instalador.nome
        pag_responses.append(r)

    return RelatorioSemanalResponse(
        semana_inicio=inicio,
        semana_fim=fim,
        total_instaladores=len(instaladores_ids),
        total_bruto=total_bruto,
        total_adiantamentos=total_adiantamentos,
        total_liquido=total_liquido,
        pagamentos=pag_responses,
    )


@router.get("/instalador/{instalador_id}", response_model=RelatorioInstaladorResponse)
def relatorio_instalador(
    instalador_id: int,
    data_inicio: date | None = Query(None),
    data_fim: date | None = Query(None),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> RelatorioInstaladorResponse:
    instalador = InstaladorRepository(db).get_by_id(instalador_id)
    if not instalador:
        raise HTTPException(status_code=404, detail="Instalador não encontrado")

    atividades = AtividadeRepository(db).list_with_filters(
        instalador_id=instalador_id,
        data_inicio=data_inicio,
        data_fim=data_fim,
        limit=500,
    )

    pagamentos_repo = PagamentoRepository(db)
    from sqlalchemy import select
    from app.models.pagamento import Pagamento
    pag_query = select(Pagamento).where(Pagamento.instalador_id == instalador_id)
    if data_inicio:
        pag_query = pag_query.where(Pagamento.semana_inicio >= data_inicio)
    if data_fim:
        pag_query = pag_query.where(Pagamento.semana_fim <= data_fim)
    pagamentos = list(db.execute(pag_query.order_by(Pagamento.criado_em.desc())).scalars().all())

    total_bruto = sum((p.valor_bruto for p in pagamentos), Decimal("0"))
    total_adiantamentos = sum((p.valor_adiantamentos for p in pagamentos), Decimal("0"))
    total_liquido = sum((p.valor_liquido for p in pagamentos), Decimal("0"))

    ativ_responses = []
    for a in atividades:
        r = AtividadeResponse.model_validate(a)
        if a.instalador:
            r.instalador_nome = a.instalador.nome
        if a.obra:
            r.obra_cliente = a.obra.cliente_nome
            r.obra_numero_pedido = a.obra.numero_pedido
        if a.servico:
            r.servico_descricao = a.servico.descricao
            r.servico_unidade = a.servico.unidade
        ativ_responses.append(r)

    pag_responses = []
    for p in pagamentos:
        r2 = PagamentoResponse.model_validate(p)
        if p.instalador:
            r2.instalador_nome = p.instalador.nome
        pag_responses.append(r2)

    return RelatorioInstaladorResponse(
        instalador_id=instalador.id,
        instalador_nome=instalador.nome,
        instalador_cpf=instalador.cpf,
        chave_pix=instalador.chave_pix,
        periodo_inicio=data_inicio,
        periodo_fim=data_fim,
        total_bruto=total_bruto,
        total_adiantamentos=total_adiantamentos,
        total_liquido=total_liquido,
        total_atividades=len(atividades),
        atividades=ativ_responses,
        pagamentos=pag_responses,
    )
