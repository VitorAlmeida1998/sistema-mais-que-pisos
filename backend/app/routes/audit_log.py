from datetime import date
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.audit_log import AuditLog
from app.models.usuario import Usuario
from app.utils.auth import require_papel
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/audit-log", tags=["audit"])


class AuditLogResponse(BaseModel):
    model_config = {"from_attributes": True}

    id: int
    usuario_id: int | None
    acao: str
    entidade: str
    entidade_id: int | None
    dados_antes: dict | None
    dados_depois: dict | None
    timestamp: datetime


@router.get("", response_model=list[AuditLogResponse])
def listar(
    entidade: str | None = Query(None),
    acao: str | None = Query(None),
    usuario_id: int | None = Query(None),
    data_inicio: date | None = Query(None),
    data_fim: date | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_papel("admin")),
) -> list[AuditLogResponse]:
    q = select(AuditLog).order_by(AuditLog.timestamp.desc())
    if entidade:
        q = q.where(AuditLog.entidade == entidade)
    if acao:
        q = q.where(AuditLog.acao == acao)
    if usuario_id:
        q = q.where(AuditLog.usuario_id == usuario_id)
    if data_inicio:
        q = q.where(AuditLog.timestamp >= data_inicio)
    if data_fim:
        from datetime import datetime, time
        q = q.where(AuditLog.timestamp <= datetime.combine(data_fim, time.max))
    q = q.offset(skip).limit(limit)
    logs = list(db.execute(q).scalars().all())
    return [AuditLogResponse.model_validate(log) for log in logs]
