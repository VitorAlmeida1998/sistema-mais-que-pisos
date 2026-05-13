from datetime import date
from decimal import Decimal
from sqlalchemy import select, func, and_
from sqlalchemy.orm import Session, joinedload
from app.models.atividade import Atividade, StatusAtividade
from app.repositories.base import BaseRepository


class AtividadeRepository(BaseRepository[Atividade]):
    def __init__(self, db: Session) -> None:
        super().__init__(Atividade, db)

    def list_with_filters(
        self,
        instalador_id: int | None = None,
        obra_id: int | None = None,
        status: StatusAtividade | None = None,
        data_inicio: date | None = None,
        data_fim: date | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> list[Atividade]:
        q = select(Atividade).options(
            joinedload(Atividade.instalador),
            joinedload(Atividade.obra),
            joinedload(Atividade.servico),
        )
        filters = []
        if instalador_id:
            filters.append(Atividade.instalador_id == instalador_id)
        if obra_id:
            filters.append(Atividade.obra_id == obra_id)
        if status:
            filters.append(Atividade.status == status)
        if data_inicio:
            filters.append(Atividade.data_execucao >= data_inicio)
        if data_fim:
            filters.append(Atividade.data_execucao <= data_fim)
        if filters:
            q = q.where(and_(*filters))
        return list(self.db.execute(q.offset(skip).limit(limit)).scalars().unique().all())

    def get_aprovadas_para_pagamento(
        self, instalador_id: int, semana_inicio: date, semana_fim: date
    ) -> list[Atividade]:
        return list(
            self.db.execute(
                select(Atividade)
                .options(joinedload(Atividade.obra), joinedload(Atividade.servico))
                .where(
                    Atividade.instalador_id == instalador_id,
                    Atividade.status == StatusAtividade.aprovada,
                    Atividade.data_execucao >= semana_inicio,
                    Atividade.data_execucao <= semana_fim,
                    Atividade.pagamento_id.is_(None),
                )
            ).scalars().unique().all()
        )

    def count_pendentes(self) -> int:
        result = self.db.execute(
            select(func.count()).where(Atividade.status == StatusAtividade.pendente).select_from(Atividade)
        ).scalar()
        return result or 0

    def sum_aprovadas(self) -> Decimal:
        result = self.db.execute(
            select(func.sum(Atividade.valor_calculado)).where(
                Atividade.status == StatusAtividade.aprovada,
                Atividade.pagamento_id.is_(None),
            )
        ).scalar()
        return Decimal(str(result)) if result else Decimal("0")
