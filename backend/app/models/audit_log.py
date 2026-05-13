import enum
from datetime import datetime
from sqlalchemy import String, DateTime, ForeignKey, Integer
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class AcaoAudit(str, enum.Enum):
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"


class AuditLog(Base):
    __tablename__ = "audit_log"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    usuario_id: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"))
    acao: Mapped[AcaoAudit] = mapped_column(
        String(10), nullable=False, index=True
    )
    entidade: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    entidade_id: Mapped[int | None] = mapped_column(Integer)
    dados_antes: Mapped[dict | None] = mapped_column(JSONB)
    dados_depois: Mapped[dict | None] = mapped_column(JSONB)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False, index=True)

    usuario: Mapped["Usuario | None"] = relationship(  # type: ignore[name-defined]
        "Usuario", back_populates="audit_logs"
    )
