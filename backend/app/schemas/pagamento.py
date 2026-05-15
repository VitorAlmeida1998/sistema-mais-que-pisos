from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, field_validator
from app.schemas.atividade import AtividadeResponse
from app.schemas.adiantamento import AdiantamentoResponse


class PagamentoPreviewRequest(BaseModel):
    instalador_id: int
    semana_inicio: date
    semana_fim: date

    @field_validator("semana_fim")
    @classmethod
    def fim_apos_inicio(cls, v: date, info: object) -> date:
        from pydantic import ValidationInfo
        if isinstance(info, ValidationInfo) and info.data.get("semana_inicio") and v < info.data["semana_inicio"]:
            raise ValueError("semana_fim deve ser igual ou posterior a semana_inicio")
        return v


class PagamentoPreviewResponse(BaseModel):
    instalador_id: int
    instalador_nome: str
    semana_inicio: date
    semana_fim: date
    atividades: list[AtividadeResponse]
    adiantamentos_pendentes: list[AdiantamentoResponse]
    valor_bruto: Decimal
    valor_adiantamentos: Decimal
    valor_liquido: Decimal


class PagamentoCreate(BaseModel):
    instalador_id: int
    semana_inicio: date
    semana_fim: date
    data_pagamento: date | None = None


class PagamentoResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    instalador_id: int
    semana_inicio: date
    semana_fim: date
    valor_bruto: Decimal
    valor_adiantamentos: Decimal
    valor_liquido: Decimal
    data_pagamento: date | None
    comprovante_pdf_path: str | None
    criado_por: int
    criado_em: datetime

    instalador_nome: str | None = None


class RelatorioSemanalResponse(BaseModel):
    semana_inicio: date
    semana_fim: date
    total_instaladores: int
    total_bruto: Decimal
    total_adiantamentos: Decimal
    total_liquido: Decimal
    pagamentos: list[PagamentoResponse]
