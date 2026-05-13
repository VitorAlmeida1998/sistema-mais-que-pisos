from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.usuario import Usuario
from app.schemas.instalador import InstaladorCreate, InstaladorUpdate, InstaladorResponse
from app.services.instalador import InstaladorService
from app.utils.auth import get_current_user, require_papel

router = APIRouter(prefix="/instaladores", tags=["instaladores"])


@router.get("", response_model=list[InstaladorResponse])
def listar(
    apenas_ativos: bool = True,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> list[InstaladorResponse]:
    return InstaladorService(db).listar(apenas_ativos, skip, limit)


@router.post("", response_model=InstaladorResponse, status_code=201)
def criar(
    data: InstaladorCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_papel("admin", "gestor")),
) -> InstaladorResponse:
    return InstaladorService(db).criar(data, current_user.id)


@router.get("/{id}", response_model=InstaladorResponse)
def obter(
    id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> InstaladorResponse:
    return InstaladorService(db).obter(id)


@router.put("/{id}", response_model=InstaladorResponse)
def atualizar(
    id: int,
    data: InstaladorUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_papel("admin", "gestor")),
) -> InstaladorResponse:
    return InstaladorService(db).atualizar(id, data, current_user.id)
