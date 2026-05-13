from sqlalchemy import select, func
from sqlalchemy.orm import Session
from app.models.obra import Obra, StatusObra
from app.repositories.base import BaseRepository


class ObraRepository(BaseRepository[Obra]):
    def __init__(self, db: Session) -> None:
        super().__init__(Obra, db)

    def list_ativas(self, skip: int = 0, limit: int = 100) -> list[Obra]:
        return list(
            self.db.execute(
                select(Obra).where(Obra.ativo == True).offset(skip).limit(limit)
            ).scalars().all()
        )

    def count_em_andamento(self) -> int:
        result = self.db.execute(
            select(func.count()).where(Obra.status == StatusObra.em_andamento, Obra.ativo == True).select_from(Obra)
        ).scalar()
        return result or 0
