from datetime import datetime
from pydantic import BaseModel, EmailStr, field_validator
from app.models.usuario import PapelUsuario


class UsuarioCreate(BaseModel):
    nome: str
    email: EmailStr
    senha: str
    papel: PapelUsuario = PapelUsuario.visualizador

    @field_validator("senha")
    @classmethod
    def senha_minima(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Senha deve ter pelo menos 8 caracteres")
        return v


class UsuarioUpdate(BaseModel):
    nome: str | None = None
    email: EmailStr | None = None
    papel: PapelUsuario | None = None
    ativo: bool | None = None
    senha: str | None = None

    @field_validator("senha")
    @classmethod
    def senha_minima(cls, v: str | None) -> str | None:
        if v is not None and len(v) < 8:
            raise ValueError("Senha deve ter pelo menos 8 caracteres")
        return v


class UsuarioResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    nome: str
    email: str
    papel: PapelUsuario
    ativo: bool
    criado_em: datetime
