import enum
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class PapelUsuario(str, enum.Enum):
    admin = "admin"
    gestor = "gestor"
    visualizador = "visualizador"


class Usuario(Base):
    __tablename__ = "usuarios"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    nome: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    senha_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    papel: Mapped[PapelUsuario] = mapped_column(
        SAEnum(PapelUsuario, name="papel_usuario"), nullable=False, default=PapelUsuario.visualizador
    )
    ativo: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    criado_em: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    atividades_aprovadas: Mapped[list["Atividade"]] = relationship(  # type: ignore[name-defined]
        "Atividade", back_populates="aprovador", foreign_keys="Atividade.aprovador_id"
    )
    adiantamentos_criados: Mapped[list["Adiantamento"]] = relationship(  # type: ignore[name-defined]
        "Adiantamento", back_populates="criado_por_usuario", foreign_keys="Adiantamento.criado_por"
    )
    pagamentos_criados: Mapped[list["Pagamento"]] = relationship(  # type: ignore[name-defined]
        "Pagamento", back_populates="criado_por_usuario", foreign_keys="Pagamento.criado_por"
    )
    audit_logs: Mapped[list["AuditLog"]] = relationship(  # type: ignore[name-defined]
        "AuditLog", back_populates="usuario"
    )
