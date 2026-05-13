from datetime import date, datetime
from decimal import Decimal
from pydantic import BaseModel, field_validator


class AdiantamentoCreate(BaseModel):
    instalador_id: int
    valor: Decimal
    data: date
    descricao: str | None = None

    @field_validator("valor")
    @classmethod
    def valor_positivo(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Valor deve ser positivo")
        return v


class AdiantamentoResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    instalador_id: int
    valor: Decimal
    data: date
    descricao: str | None
    pagamento_id: int | None
    criado_por: int
    criado_em: datetime

    instalador_nome: str | None = None
