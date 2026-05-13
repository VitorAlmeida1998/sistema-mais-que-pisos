import enum
from datetime import datetime
from decimal import Decimal
from sqlalchemy import String, Boolean, DateTime, Numeric, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class UnidadeServico(str, enum.Enum):
    m2 = "m2"
    unidade = "unidade"
    diaria = "diaria"
    metro_linear = "metro_linear"


class Servico(Base):
    __tablename__ = "servicos"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    descricao: Mapped[str] = mapped_column(String(300), nullable=False)
    unidade: Mapped[UnidadeServico] = mapped_column(
        SAEnum(UnidadeServico, name="unidade_servico"), nullable=False
    )
    valor_unitario: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    atividades: Mapped[list["Atividade"]] = relationship(  # type: ignore[name-defined]
        "Atividade", back_populates="servico"
    )
