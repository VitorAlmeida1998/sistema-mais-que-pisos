from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.servico import Servico
from app.repositories.servico import ServicoRepository
from app.schemas.servico import ServicoCreate, ServicoUpdate, ServicoResponse


class ServicoService:
    def __init__(self, db: Session) -> None:
        self.repo = ServicoRepository(db)

    def criar(self, data: ServicoCreate) -> ServicoResponse:
        servico = Servico(**data.model_dump())
        created = self.repo.create(servico)
        return ServicoResponse.model_validate(created)

    def listar(self, apenas_ativos: bool = True) -> list[ServicoResponse]:
        items = self.repo.list_ativos() if apenas_ativos else self.repo.list_all()
        return [ServicoResponse.model_validate(i) for i in items]

    def obter(self, id: int) -> ServicoResponse:
        item = self.repo.get_by_id(id)
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Serviço não encontrado")
        return ServicoResponse.model_validate(item)

    def atualizar(self, id: int, data: ServicoUpdate) -> ServicoResponse:
        item = self.repo.get_by_id(id)
        if not item:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Serviço não encontrado")
        updated = self.repo.update(item, data.model_dump(exclude_none=True))
        return ServicoResponse.model_validate(updated)
