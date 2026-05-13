from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import String, Date, DateTime, Numeric, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class Adiantamento(Base):
    __tablename__ = "adiantamentos"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    instalador_id: Mapped[int] = mapped_column(ForeignKey("instaladores.id"), nullable=False, index=True)
    valor: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    data: Mapped[date] = mapped_column(Date, nullable=False)
    descricao: Mapped[str | None] = mapped_column(Text)
    pagamento_id: Mapped[int | None] = mapped_column(ForeignKey("pagamentos.id"))
    criado_por: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False)
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    instalador: Mapped["Instalador"] = relationship(  # type: ignore[name-defined]
        "Instalador", back_populates="adiantamentos"
    )
    pagamento: Mapped["Pagamento | None"] = relationship(  # type: ignore[name-defined]
        "Pagamento", back_populates="adiantamentos", foreign_keys=[pagamento_id]
    )
    criado_por_usuario: Mapped["Usuario"] = relationship(  # type: ignore[name-defined]
        "Usuario", back_populates="adiantamentos_criados", foreign_keys=[criado_por]
    )
