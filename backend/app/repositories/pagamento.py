from datetime import date
from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload
from app.models.pagamento import Pagamento
from app.repositories.base import BaseRepository


class PagamentoRepository(BaseRepository[Pagamento]):
    def __init__(self, db: Session) -> None:
        super().__init__(Pagamento, db)

    def list_with_instalador(self, skip: int = 0, limit: int = 100) -> list[Pagamento]:
        return list(
            self.db.execute(
                select(Pagamento)
                .options(joinedload(Pagamento.instalador))
                .order_by(Pagamento.criado_em.desc())
                .offset(skip).limit(limit)
            ).scalars().unique().all()
        )

    def get_with_details(self, pagamento_id: int) -> Pagamento | None:
        return self.db.execute(
            select(Pagamento)
            .options(
                joinedload(Pagamento.instalador),
                joinedload(Pagamento.atividades).joinedload(Pagamento.atividades.property.mapper.class_.obra),  # type: ignore[attr-defined]
                joinedload(Pagamento.atividades).joinedload(Pagamento.atividades.property.mapper.class_.servico),  # type: ignore[attr-defined]
                joinedload(Pagamento.adiantamentos),
            )
            .where(Pagamento.id == pagamento_id)
        ).scalar_one_or_none()

    def list_by_periodo(self, inicio: date, fim: date) -> list[Pagamento]:
        return list(
            self.db.execute(
                select(Pagamento)
                .options(joinedload(Pagamento.instalador))
                .where(
                    Pagamento.semana_inicio >= inicio,
                    Pagamento.semana_fim <= fim,
                )
            ).scalars().unique().all()
        )
