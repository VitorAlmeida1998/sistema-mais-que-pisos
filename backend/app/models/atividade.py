import enum
from datetime import date, datetime
from decimal import Decimal
from sqlalchemy import String, Date, DateTime, Numeric, ForeignKey, Text, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class StatusAtividade(str, enum.Enum):
    pendente = "pendente"
    aprovada = "aprovada"
    paga = "paga"


class Atividade(Base):
    __tablename__ = "atividades"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    instalador_id: Mapped[int] = mapped_column(ForeignKey("instaladores.id"), nullable=False, index=True)
    obra_id: Mapped[int] = mapped_column(ForeignKey("obras.id"), nullable=False, index=True)
    servico_id: Mapped[int] = mapped_column(ForeignKey("servicos.id"), nullable=False)
    quantidade: Mapped[Decimal] = mapped_column(Numeric(12, 3), nullable=False)
    data_execucao: Mapped[date] = mapped_column(Date, nullable=False)
    valor_calculado: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    status: Mapped[StatusAtividade] = mapped_column(
        SAEnum(StatusAtividade, name="status_atividade"),
        default=StatusAtividade.pendente,
        nullable=False,
        index=True,
    )
    aprovador_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"))
    observacao: Mapped[str | None] = mapped_column(Text)
    pagamento_id: Mapped[int | None] = mapped_column(ForeignKey("pagamentos.id"))
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    instalador: Mapped["Instalador"] = relationship(  # type: ignore[name-defined]
        "Instalador", back_populates="atividades"
    )
    obra: Mapped["Obra"] = relationship("Obra", back_populates="atividades")  # type: ignore[name-defined]
    servico: Mapped["Servico"] = relationship("Servico", back_populates="atividades")  # type: ignore[name-defined]
    aprovador: Mapped["Usuario | None"] = relationship(  # type: ignore[name-defined]
        "Usuario", back_populates="atividades_aprovadas", foreign_keys=[aprovador_id]
    )
    pagamento: Mapped["Pagamento | None"] = relationship(  # type: ignore[name-defined]
        "Pagamento", back_populates="atividades", foreign_keys=[pagamento_id]
    )
