from sqlalchemy import select, func
from sqlalchemy.orm import Session
from app.models.instalador import Instalador
from app.repositories.base import BaseRepository


class InstaladorRepository(BaseRepository[Instalador]):
    def __init__(self, db: Session) -> None:
        super().__init__(Instalador, db)

    def get_by_cpf(self, cpf: str) -> Instalador | None:
        return self.db.execute(select(Instalador).where(Instalador.cpf == cpf)).scalar_one_or_none()

    def list_ativos(self, skip: int = 0, limit: int = 100) -> list[Instalador]:
        return list(
            self.db.execute(
                select(Instalador).where(Instalador.ativo == True).offset(skip).limit(limit)
            ).scalars().all()
        )

    def count_ativos(self) -> int:
        result = self.db.execute(select(func.count()).where(Instalador.ativo == True).select_from(Instalador)).scalar()
        return result or 0
