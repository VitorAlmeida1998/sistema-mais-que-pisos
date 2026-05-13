from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload
from app.models.adiantamento import Adiantamento
from app.repositories.base import BaseRepository


class AdiantamentoRepository(BaseRepository[Adiantamento]):
    def __init__(self, db: Session) -> None:
        super().__init__(Adiantamento, db)

    def get_pendentes_instalador(self, instalador_id: int) -> list[Adiantamento]:
        return list(
            self.db.execute(
                select(Adiantamento).where(
                    Adiantamento.instalador_id == instalador_id,
                    Adiantamento.pagamento_id.is_(None),
                )
            ).scalars().all()
        )

    def list_by_instalador(self, instalador_id: int, skip: int = 0, limit: int = 100) -> list[Adiantamento]:
        return list(
            self.db.execute(
                select(Adiantamento)
                .options(joinedload(Adiantamento.instalador))
                .where(Adiantamento.instalador_id == instalador_id)
                .offset(skip).limit(limit)
            ).scalars().unique().all()
        )

    def list_all_with_instalador(self, skip: int = 0, limit: int = 100) -> list[Adiantamento]:
        return list(
            self.db.execute(
                select(Adiantamento)
                .options(joinedload(Adiantamento.instalador))
                .offset(skip).limit(limit)
            ).scalars().unique().all()
        )
