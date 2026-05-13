from datetime import date
from decimal import Decimal
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.usuario import Usuario
from app.repositories.pagamento import PagamentoRepository
from app.schemas.pagamento import RelatorioSemanalResponse, PagamentoResponse
from app.utils.auth import get_current_user

router = APIRouter(prefix="/relatorios", tags=["relatorios"])


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
