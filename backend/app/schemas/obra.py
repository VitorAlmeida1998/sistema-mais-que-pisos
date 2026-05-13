from datetime import date, datetime
from pydantic import BaseModel, field_validator
from app.models.obra import StatusObra


class ObraCreate(BaseModel):
    cliente_nome: str
    endereco: str
    data_inicio: date
    data_fim_prevista: date | None = None
    status: StatusObra = StatusObra.em_andamento
    observacoes: str | None = None

    @field_validator("data_fim_prevista")
    @classmethod
    def data_fim_apos_inicio(cls, v: date | None, info: object) -> date | None:
        return v


class ObraUpdate(BaseModel):
    cliente_nome: str | None = None
    endereco: str | None = None
    data_inicio: date | None = None
    data_fim_prevista: date | None = None
    status: StatusObra | None = None
    ativo: bool | None = None
    observacoes: str | None = None


class ObraResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    cliente_nome: str
    endereco: str
    data_inicio: date
    data_fim_prevista: date | None
    status: StatusObra
    ativo: bool
    observacoes: str | None
    criado_em: datetime
