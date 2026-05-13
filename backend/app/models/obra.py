import enum
from datetime import date, datetime
from sqlalchemy import String, Date, DateTime, Text, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class StatusObra(str, enum.Enum):
    em_andamento = "em_andamento"
    concluida = "concluida"
    cancelada = "cancelada"


class Obra(Base):
    __tablename__ = "obras"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    cliente_nome: Mapped[str] = mapped_column(String(200), nullable=False)
    endereco: Mapped[str] = mapped_column(String(500), nullable=False)
    data_inicio: Mapped[date] = mapped_column(Date, nullable=False)
    data_fim_prevista: Mapped[date | None] = mapped_column(Date)
    status: Mapped[StatusObra] = mapped_column(
        SAEnum(StatusObra, name="status_obra"),
        default=StatusObra.em_andamento,
        nullable=False,
    )
    ativo: Mapped[bool] = mapped_column(default=True, nullable=False)
    observacoes: Mapped[str | None] = mapped_column(Text)
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    atividades: Mapped[list["Atividade"]] = relationship(  # type: ignore[name-defined]
        "Atividade", back_populates="obra"
    )
