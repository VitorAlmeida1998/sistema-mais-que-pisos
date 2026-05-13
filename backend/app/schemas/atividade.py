from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, field_validator
from app.models.atividade import StatusAtividade


class AtividadeCreate(BaseModel):
    instalador_id: int
    obra_id: int
    servico_id: int
    quantidade: Decimal
    data_execucao: date
    observacao: str | None = None

    @field_validator("quantidade")
    @classmethod
    def quantidade_positiva(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Quantidade deve ser positiva")
        return v


class AtividadeUpdate(BaseModel):
    quantidade: Decimal | None = None
    data_execucao: date | None = None
    observacao: str | None = None

    @field_validator("quantidade")
    @classmethod
    def quantidade_positiva(cls, v: Decimal | None) -> Decimal | None:
        if v is not None and v <= 0:
            raise ValueError("Quantidade deve ser positiva")
        return v


class AtividadeResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    instalador_id: int
    obra_id: int
    servico_id: int
    quantidade: Decimal
    data_execucao: date
    valor_calculado: Decimal
    status: StatusAtividade
    aprovador_id: int | None
    observacao: str | None
    pagamento_id: int | None
    criado_em: datetime

    instalador_nome: str | None = None
    obra_cliente: str | None = None
    servico_descricao: str | None = None
    servico_unidade: str | None = None


class AtividadeDetalhadaResponse(AtividadeResponse):
    model_config = {"from_attributes": True}
