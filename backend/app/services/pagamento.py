import structlog
from decimal import Decimal
from fastapi import HTTPException
from sqlalchemy.orm import Session

logger = structlog.get_logger()
from app.models.atividade import StatusAtividade
from app.models.pagamento import Pagamento
from app.repositories.atividade import AtividadeRepository
from app.repositories.adiantamento import AdiantamentoRepository
from app.repositories.instalador import InstaladorRepository
from app.repositories.pagamento import PagamentoRepository
from app.schemas.atividade import AtividadeResponse
from app.schemas.adiantamento import AdiantamentoResponse
from app.schemas.pagamento import (
    PagamentoCreate, PagamentoPreviewRequest, PagamentoPreviewResponse, PagamentoResponse
)
from app.utils.audit_listener import set_audit_user


class PagamentoService:
    def __init__(self, db: Session) -> None:
        self.db = db
        self.repo = PagamentoRepository(db)
        self.ativ_repo = AtividadeRepository(db)
        self.adt_repo = AdiantamentoRepository(db)
        self.inst_repo = InstaladorRepository(db)

    def preview(self, data: PagamentoPreviewRequest) -> PagamentoPreviewResponse:
        instalador = self.inst_repo.get_by_id(data.instalador_id)
        if not instalador:
            raise HTTPException(status_code=404, detail="Instalador não encontrado")

        atividades = self.ativ_repo.get_aprovadas_para_pagamento(
            data.instalador_id, data.semana_inicio, data.semana_fim
        )
        adiantamentos = self.adt_repo.get_pendentes_instalador(data.instalador_id)

        valor_bruto = sum((a.valor_calculado for a in atividades), Decimal("0"))
        valor_adiantamentos = sum((a.valor for a in adiantamentos), Decimal("0"))
        valor_liquido = max(valor_bruto - valor_adiantamentos, Decimal("0"))

        ativ_responses = [self._enrich_atividade(a) for a in atividades]
        adt_responses = [AdiantamentoResponse.model_validate(a) for a in adiantamentos]

        return PagamentoPreviewResponse(
            instalador_id=data.instalador_id,
            instalador_nome=instalador.nome,
            semana_inicio=data.semana_inicio,
            semana_fim=data.semana_fim,
            atividades=ativ_responses,
            adiantamentos_pendentes=adt_responses,
            valor_bruto=valor_bruto,
            valor_adiantamentos=valor_adiantamentos,
            valor_liquido=valor_liquido,
        )

    def efetivar(self, data: PagamentoCreate, usuario_id: int) -> PagamentoResponse:
        instalador = self.inst_repo.get_by_id(data.instalador_id)
        if not instalador:
            raise HTTPException(status_code=404, detail="Instalador não encontrado")

        atividades = self.ativ_repo.get_aprovadas_para_pagamento(
            data.instalador_id, data.semana_inicio, data.semana_fim
        )
        if not atividades:
            raise HTTPException(status_code=400, detail="Nenhuma atividade aprovada no período")

        adiantamentos = self.adt_repo.get_pendentes_instalador(data.instalador_id)

        valor_bruto = sum((a.valor_calculado for a in atividades), Decimal("0"))
        valor_adiantamentos = sum((a.valor for a in adiantamentos), Decimal("0"))
        valor_liquido = max(valor_bruto - valor_adiantamentos, Decimal("0"))

        set_audit_user(usuario_id)
        pagamento = Pagamento(
            instalador_id=data.instalador_id,
            semana_inicio=data.semana_inicio,
            semana_fim=data.semana_fim,
            valor_bruto=valor_bruto,
            valor_adiantamentos=valor_adiantamentos,
            valor_liquido=valor_liquido,
            data_pagamento=data.data_pagamento,
            criado_por=usuario_id,
        )
        self.db.add(pagamento)
        self.db.flush()

        for atividade in atividades:
            atividade.status = StatusAtividade.paga
            atividade.pagamento_id = pagamento.id

        for adiantamento in adiantamentos:
            adiantamento.pagamento_id = pagamento.id

        self.db.commit()
        self.db.refresh(pagamento)

        # Gerar PDF
        try:
            from app.services.pdf_generator import gerar_recibo_pdf
            pdf_data = self._build_pdf_data(pagamento, instalador, atividades, adiantamentos)
            pdf_path = gerar_recibo_pdf(pdf_data)
            pagamento.comprovante_pdf_path = pdf_path
            self.db.commit()
            self.db.refresh(pagamento)
        except Exception as exc:
            # PDF é opcional — falha não bloqueia o pagamento
            logger.warning("falha_ao_gerar_pdf", pagamento_id=pagamento.id, erro=str(exc))

        r = PagamentoResponse.model_validate(pagamento)
        r.instalador_nome = instalador.nome
        return r

    def listar(self, skip: int = 0, limit: int = 100) -> list[PagamentoResponse]:
        items = self.repo.list_with_instalador(skip, limit)
        result = []
        for p in items:
            r = PagamentoResponse.model_validate(p)
            if p.instalador:
                r.instalador_nome = p.instalador.nome
            result.append(r)
        return result

    def obter(self, id: int) -> Pagamento:
        p = self.repo.get_by_id(id)
        if not p:
            raise HTTPException(status_code=404, detail="Pagamento não encontrado")
        return p

    def _enrich_atividade(self, a: "Atividade") -> AtividadeResponse:  # type: ignore[name-defined]
        r = AtividadeResponse.model_validate(a)
        if hasattr(a, "obra") and a.obra:
            r.obra_cliente = a.obra.cliente_nome
        if hasattr(a, "servico") and a.servico:
            r.servico_descricao = a.servico.descricao
            r.servico_unidade = a.servico.unidade
        return r

    def _build_pdf_data(self, pagamento: Pagamento, instalador: "Instalador", atividades: list, adiantamentos: list) -> dict:  # type: ignore[name-defined]
        from decimal import Decimal as D
        return {
            "id": pagamento.id,
            "semana_inicio": str(pagamento.semana_inicio),
            "semana_fim": str(pagamento.semana_fim),
            "data_pagamento": str(pagamento.data_pagamento) if pagamento.data_pagamento else None,
            "valor_bruto": pagamento.valor_bruto,
            "valor_adiantamentos": pagamento.valor_adiantamentos,
            "valor_liquido": pagamento.valor_liquido,
            "instalador": {
                "nome": instalador.nome,
                "cpf": instalador.cpf,
                "telefone": instalador.telefone,
                "chave_pix": instalador.chave_pix,
                "eh_mei": instalador.eh_mei,
                "cnpj_mei": instalador.cnpj_mei,
            },
            "atividades": [
                {
                    "data_execucao": str(a.data_execucao),
                    "obra_cliente": a.obra.cliente_nome if a.obra else "",
                    "servico_descricao": a.servico.descricao if a.servico else "",
                    "servico_unidade": a.servico.unidade if a.servico else "",
                    "quantidade": a.quantidade,
                    "valor_unitario": a.servico.valor_unitario if a.servico else D("0"),
                    "valor_calculado": a.valor_calculado,
                }
                for a in atividades
            ],
            "adiantamentos": [
                {
                    "data": str(adt.data),
                    "descricao": adt.descricao,
                    "valor": adt.valor,
                }
                for adt in adiantamentos
            ],
        }
