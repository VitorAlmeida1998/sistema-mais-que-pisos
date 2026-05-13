from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.usuario import Usuario
from app.schemas.adiantamento import AdiantamentoCreate, AdiantamentoResponse
from app.services.adiantamento import AdiantamentoService
from app.utils.auth import get_current_user, require_papel

router = APIRouter(prefix="/adiantamentos", tags=["adiantamentos"])


@router.get("", response_model=list[AdiantamentoResponse])
def listar(
    instalador_id: int | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> list[AdiantamentoResponse]:
    return AdiantamentoService(db).listar(instalador_id, skip, limit)


@router.post("", response_model=AdiantamentoResponse, status_code=201)
def criar(
    data: AdiantamentoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_papel("admin", "gestor")),
) -> AdiantamentoResponse:
    return AdiantamentoService(db).criar(data, current_user.id)
