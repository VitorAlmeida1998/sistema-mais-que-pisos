from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import String, Date, DateTime, Numeric, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class Pagamento(Base):
    __tablename__ = "pagamentos"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    instalador_id: Mapped[int] = mapped_column(ForeignKey("instaladores.id"), nullable=False, index=True)
    semana_inicio: Mapped[date] = mapped_column(Date, nullable=False)
    semana_fim: Mapped[date] = mapped_column(Date, nullable=False)
    valor_bruto: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    valor_adiantamentos: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
    valor_liquido: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    data_pagamento: Mapped[date | None] = mapped_column(Date)
    comprovante_pdf_path: Mapped[str | None] = mapped_column(String(500))
    criado_por: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False)
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    instalador: Mapped["Instalador"] = relationship(  # type: ignore[name-defined]
        "Instalador", back_populates="pagamentos"
    )
    criado_por_usuario: Mapped["Usuario"] = relationship(  # type: ignore[name-defined]
        "Usuario", back_populates="pagamentos_criados", foreign_keys=[criado_por]
    )
    atividades: Mapped[list["Atividade"]] = relationship(  # type: ignore[name-defined]
        "Atividade", back_populates="pagamento", foreign_keys="Atividade.pagamento_id"
    )
    adiantamentos: Mapped[list["Adiantamento"]] = relationship(  # type: ignore[name-defined]
        "Adiantamento", back_populates="pagamento", foreign_keys="Adiantamento.pagamento_id"
    )
