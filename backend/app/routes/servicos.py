from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.usuario import Usuario
from app.schemas.servico import ServicoCreate, ServicoUpdate, ServicoResponse
from app.services.servico import ServicoService
from app.utils.auth import get_current_user, require_papel

router = APIRouter(prefix="/servicos", tags=["servicos"])


@router.get("", response_model=list[ServicoResponse])
def listar(
    apenas_ativos: bool = True,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> list[ServicoResponse]:
    return ServicoService(db).listar(apenas_ativos)


@router.post("", response_model=ServicoResponse, status_code=201)
def criar(
    data: ServicoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_papel("admin")),
) -> ServicoResponse:
    return ServicoService(db).criar(data)


@router.get("/{id}", response_model=ServicoResponse)
def obter(
    id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> ServicoResponse:
    return ServicoService(db).obter(id)


@router.put("/{id}", response_model=ServicoResponse)
def atualizar(
    id: int,
    data: ServicoUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_papel("admin")),
) -> ServicoResponse:
    return ServicoService(db).atualizar(id, data)
