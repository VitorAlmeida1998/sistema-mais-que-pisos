from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.usuario import Usuario
from app.repositories.usuario import UsuarioRepository
from app.schemas.usuario import UsuarioCreate, UsuarioUpdate, UsuarioResponse
from app.utils.auth import hash_senha


class UsuarioService:
    def __init__(self, db: Session) -> None:
        self.repo = UsuarioRepository(db)

    def criar(self, data: UsuarioCreate) -> UsuarioResponse:
        if self.repo.get_by_email(data.email):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="E-mail já cadastrado")
        usuario = Usuario(
            nome=data.nome,
            email=data.email,
            senha_hash=hash_senha(data.senha),
            papel=data.papel,
        )
        created = self.repo.create(usuario)
        return UsuarioResponse.model_validate(created)

    def listar(self) -> list[UsuarioResponse]:
        return [UsuarioResponse.model_validate(u) for u in self.repo.list_all()]

    def obter(self, id: int) -> UsuarioResponse:
        u = self.repo.get_by_id(id)
        if not u:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")
        return UsuarioResponse.model_validate(u)

    def atualizar(self, id: int, data: UsuarioUpdate) -> UsuarioResponse:
        u = self.repo.get_by_id(id)
        if not u:
            raise HTTPException(status_code=404, detail="Usuário não encontrado")
        updates = data.model_dump(exclude_none=True)
        if "senha" in updates:
            updates["senha_hash"] = hash_senha(updates.pop("senha"))
        if "email" in updates:
            existing = self.repo.get_by_email(updates["email"])
            if existing and existing.id != id:
                raise HTTPException(status_code=409, detail="E-mail já em uso")
        updated = self.repo.update(u, updates)
        return UsuarioResponse.model_validate(updated)
