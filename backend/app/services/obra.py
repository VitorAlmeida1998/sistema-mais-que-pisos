from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.obra import Obra
from app.repositories.obra import ObraRepository
from app.schemas.obra import ObraCreate, ObraUpdate, ObraResponse
from app.utils.audit_listener import set_audit_user


class ObraService:
    def __init__(self, db: Session) -> None:
        self.repo = ObraRepository(db)

    def criar(self, data: ObraCreate, usuario_id: int) -> ObraResponse:
        set_audit_user(usuario_id)
        obra = Obra(**data.model_dump())
        created = self.repo.create(obra)
        return ObraResponse.model_validate(created)

    def listar(self, apenas_ativas: bool = True, skip: int = 0, limit: int = 100) -> list[ObraResponse]:
        items = self.repo.list_ativas(skip, limit) if apenas_ativas else self.repo.list_all(skip, limit)
        return [ObraResponse.model_validate(i) for i in items]

    def obter(self, id: int) -> ObraResponse:
        item = self.repo.get_by_id(id)
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Obra não encontrada")
        return ObraResponse.model_validate(item)

    def atualizar(self, id: int, data: ObraUpdate, usuario_id: int) -> ObraResponse:
        item = self.repo.get_by_id(id)
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Obra não encontrada")
        set_audit_user(usuario_id)
        updated = self.repo.update(item, data.model_dump(exclude_none=True))
        return ObraResponse.model_validate(updated)
