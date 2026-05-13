from __future__ import annotations

from contextvars import ContextVar
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import event

ENTIDADES_AUDITADAS = {"atividades", "adiantamentos", "pagamentos"}

_audit_user: ContextVar[int | None] = ContextVar("audit_user", default=None)


def set_audit_user(usuario_id: int | None) -> None:
    _audit_user.set(usuario_id)


def get_audit_user() -> int | None:
    return _audit_user.get()


def _serializar(obj: Any) -> Any:
    if obj is None or isinstance(obj, (bool, int, float, str)):
        return obj
    if isinstance(obj, Decimal):
        return float(obj)
    if isinstance(obj, datetime):
        return obj.isoformat()
    if isinstance(obj, date):
        return obj.isoformat()
    return str(obj)


def _get_dados(instance: Any) -> dict[str, Any]:
    return {
        col.key: _serializar(getattr(instance, col.key, None))
        for col in instance.__class__.__mapper__.columns
    }


def registrar_audit(
    connection: Any,
    acao: str,
    entidade: str,
    entidade_id: int | None,
    dados_antes: dict | None,
    dados_depois: dict | None,
) -> None:
    from app.models.audit_log import AuditLog
    from sqlalchemy import insert as sa_insert

    connection.execute(
        sa_insert(AuditLog.__table__).values(
            usuario_id=get_audit_user(),
            acao=acao,
            entidade=entidade,
            entidade_id=entidade_id,
            dados_antes=dados_antes,
            dados_depois=dados_depois,
            timestamp=datetime.utcnow(),
        )
    )


_listeners_setup = False


def setup_audit_listeners() -> None:
    global _listeners_setup
    if _listeners_setup:
        return
    _listeners_setup = True

    from app.models.atividade import Atividade
    from app.models.adiantamento import Adiantamento
    from app.models.pagamento import Pagamento

    for cls in (Atividade, Adiantamento, Pagamento):
        tablename = cls.__tablename__

        @event.listens_for(cls, "after_insert")
        def after_insert(mapper: Any, connection: Any, target: Any, _tn: str = tablename) -> None:
            registrar_audit(connection, "CREATE", _tn, target.id, None, _get_dados(target))

        @event.listens_for(cls, "after_update")
        def after_update(mapper: Any, connection: Any, target: Any, _tn: str = tablename) -> None:
            registrar_audit(connection, "UPDATE", _tn, target.id, None, _get_dados(target))

        @event.listens_for(cls, "after_delete")
        def after_delete(mapper: Any, connection: Any, target: Any, _tn: str = tablename) -> None:
            registrar_audit(connection, "DELETE", _tn, target.id, _get_dados(target), None)
