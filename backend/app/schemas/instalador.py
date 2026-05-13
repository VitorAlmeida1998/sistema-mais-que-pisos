from datetime import datetime
from pydantic import BaseModel, field_validator
from app.utils.cpf_validator import validar_cpf


class InstaladorCreate(BaseModel):
    nome: str
    cpf: str
    telefone: str | None = None
    chave_pix: str | None = None
    banco: str | None = None
    agencia: str | None = None
    conta: str | None = None
    eh_mei: bool = False
    cnpj_mei: str | None = None
    observacoes: str | None = None

    @field_validator("cpf")
    @classmethod
    def cpf_valido(cls, v: str) -> str:
        cpf = v.replace(".", "").replace("-", "").strip()
        if not validar_cpf(cpf):
            raise ValueError("CPF inválido")
        return cpf

    @field_validator("cnpj_mei")
    @classmethod
    def cnpj_formato(cls, v: str | None) -> str | None:
        if v:
            return v.replace(".", "").replace("/", "").replace("-", "").strip()
        return v


class InstaladorUpdate(BaseModel):
    nome: str | None = None
    telefone: str | None = None
    chave_pix: str | None = None
    banco: str | None = None
    agencia: str | None = None
    conta: str | None = None
    eh_mei: bool | None = None
    cnpj_mei: str | None = None
    ativo: bool | None = None
    observacoes: str | None = None


class InstaladorResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    nome: str
    cpf: str
    telefone: str | None
    chave_pix: str | None
    banco: str | None
    agencia: str | None
    conta: str | None
    eh_mei: bool
    cnpj_mei: str | None
    ativo: bool
    observacoes: str | None
    criado_em: datetime
