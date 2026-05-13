from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class Instalador(Base):
    __tablename__ = "instaladores"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nome: Mapped[str] = mapped_column(String(150), nullable=False)
    cpf: Mapped[str] = mapped_column(String(14), unique=True, nullable=False, index=True)
    telefone: Mapped[str | None] = mapped_column(String(20))
    chave_pix: Mapped[str | None] = mapped_column(String(255))
    banco: Mapped[str | None] = mapped_column(String(100))
    agencia: Mapped[str | None] = mapped_column(String(20))
    conta: Mapped[str | None] = mapped_column(String(30))
    eh_mei: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    cnpj_mei: Mapped[str | None] = mapped_column(String(18))
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    observacoes: Mapped[str | None] = mapped_column(Text)
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    atividades: Mapped[list["Atividade"]] = relationship(  # type: ignore[name-defined]
        "Atividade", back_populates="instalador"
    )
    adiantamentos: Mapped[list["Adiantamento"]] = relationship(  # type: ignore[name-defined]
        "Adiantamento", back_populates="instalador"
    )
    pagamentos: Mapped[list["Pagamento"]] = relationship(  # type: ignore[name-defined]
        "Pagamento", back_populates="instalador"
    )
