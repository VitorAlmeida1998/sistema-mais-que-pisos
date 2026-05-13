from sqlalchemy import select
from sqlalchemy.orm import Session
from app.models.servico import Servico
from app.repositories.base import BaseRepository


class ServicoRepository(BaseRepository[Servico]):
    def __init__(self, db: Session) -> None:
        super().__init__(Servico, db)

    def list_ativos(self) -> list[Servico]:
        return list(self.db.execute(select(Servico).where(Servico.ativo == True)).scalars().all())
