from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.usuario import Usuario
from app.schemas.usuario import UsuarioCreate, UsuarioUpdate, UsuarioResponse
from app.services.usuario import UsuarioService
from app.utils.auth import get_current_user, require_papel

router = APIRouter(prefix="/usuarios", tags=["usuarios"])


@router.get("", response_model=list[UsuarioResponse])
def listar(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_papel("admin")),
) -> list[UsuarioResponse]:
    return UsuarioService(db).listar()


@router.post("", response_model=UsuarioResponse, status_code=201)
def criar(
    data: UsuarioCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_papel("admin")),
) -> UsuarioResponse:
    return UsuarioService(db).criar(data)


@router.get("/me", response_model=UsuarioResponse)
def me(current_user: Usuario = Depends(get_current_user)) -> UsuarioResponse:
    return UsuarioResponse.model_validate(current_user)


@router.get("/{id}", response_model=UsuarioResponse)
def obter(
    id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_papel("admin")),
) -> UsuarioResponse:
    return UsuarioService(db).obter(id)


@router.put("/{id}", response_model=UsuarioResponse)
def atualizar(
    id: int,
    data: UsuarioUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_papel("admin")),
) -> UsuarioResponse:
    return UsuarioService(db).atualizar(id, data)
