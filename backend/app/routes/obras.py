from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.usuario import Usuario
from app.schemas.obra import ObraCreate, ObraUpdate, ObraResponse
from app.services.obra import ObraService
from app.utils.auth import get_current_user, require_papel

router = APIRouter(prefix="/obras", tags=["obras"])


@router.get("", response_model=list[ObraResponse])
def listar(
    apenas_ativas: bool = True,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> list[ObraResponse]:
    return ObraService(db).listar(apenas_ativas, skip, limit)


@router.post("", response_model=ObraResponse, status_code=201)
def criar(
    data: ObraCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_papel("admin", "gestor")),
) -> ObraResponse:
    return ObraService(db).criar(data, current_user.id)


@router.get("/{id}", response_model=ObraResponse)
def obter(
    id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> ObraResponse:
    return ObraService(db).obter(id)


@router.put("/{id}", response_model=ObraResponse)
def atualizar(
    id: int,
    data: ObraUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_papel("admin", "gestor")),
) -> ObraResponse:
    return ObraService(db).atualizar(id, data, current_user.id)
