from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, field_validator
from app.models.servico import UnidadeServico


class ServicoCreate(BaseModel):
    descricao: str
    unidade: UnidadeServico
    valor_unitario: Decimal

    @field_validator("valor_unitario")
    @classmethod
    def valor_positivo(cls, v: Decimal) -> Decimal:
        if v <= 0:
            raise ValueError("Valor unitário deve ser positivo")
        return v


class ServicoUpdate(BaseModel):
    descricao: str | None = None
    unidade: UnidadeServico | None = None
    valor_unitario: Decimal | None = None
    ativo: bool | None = None

    @field_validator("valor_unitario")
    @classmethod
    def valor_positivo(cls, v: Decimal | None) -> Decimal | None:
        if v is not None and v <= 0:
            raise ValueError("Valor unitário deve ser positivo")
        return v


class ServicoResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    descricao: str
    unidade: UnidadeServico
    valor_unitario: Decimal
    ativo: bool
    criado_em: datetime
