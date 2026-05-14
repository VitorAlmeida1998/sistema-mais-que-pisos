from datetime import date
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.atividade import StatusAtividade
from app.models.usuario import Usuario
from app.schemas.atividade import AtividadeCreate, AtividadeUpdate, AtividadeResponse
from app.services.atividade import AtividadeService
from app.utils.auth import get_current_user, require_papel

router = APIRouter(prefix="/atividades", tags=["atividades"])


@router.get("", response_model=list[AtividadeResponse])
def listar(
    instalador_id: int | None = Query(None),
    obra_id: int | None = Query(None),
    status: StatusAtividade | None = Query(None),
    data_inicio: date | None = Query(None),
    data_fim: date | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> list[AtividadeResponse]:
    return AtividadeService(db).listar(instalador_id, obra_id, status, data_inicio, data_fim, skip, limit)


@router.post("", response_model=AtividadeResponse, status_code=201)
def criar(
    data: AtividadeCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_papel("admin", "gestor")),
) -> AtividadeResponse:
    return AtividadeService(db).criar(data, current_user.id)


@router.get("/{id}", response_model=AtividadeResponse)
def obter(
    id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> AtividadeResponse:
    return AtividadeService(db).obter(id)


@router.put("/{id}", response_model=AtividadeResponse)
def atualizar(
    id: int,
    data: AtividadeUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_papel("admin", "gestor")),
) -> AtividadeResponse:
    return AtividadeService(db).atualizar(id, data, current_user.id)


@router.post("/{id}/aprovar", response_model=AtividadeResponse)
def aprovar(
    id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_papel("admin", "gestor")),
) -> AtividadeResponse:
    return AtividadeService(db).aprovar(id, current_user.id)


@router.delete("/{id}", status_code=204)
def deletar(
    id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_papel("admin", "gestor")),
) -> None:
    from app.models.usuario import PapelUsuario
    is_admin = current_user.papel == PapelUsuario.admin
    AtividadeService(db).deletar(id, current_user.id, is_admin)
