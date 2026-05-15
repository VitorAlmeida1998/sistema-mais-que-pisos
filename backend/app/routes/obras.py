import os
from fastapi import APIRouter, Depends, Query
from fastapi.responses import FileResponse
from starlette.background import BackgroundTask
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


@router.delete("/{id}", status_code=204)
def deletar(
    id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_papel("admin")),
) -> None:
    ObraService(db).deletar(id, current_user.id)


@router.get("/{id}/relatorio-pdf")
def relatorio_pdf(
    id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> FileResponse:
    from app.services.atividade import AtividadeService
    from app.services.pdf_generator import gerar_relatorio_obra_pdf

    obra = ObraService(db).obter(id)
    atividades = AtividadeService(db).listar(obra_id=id, limit=500)

    path = gerar_relatorio_obra_pdf(
        obra.model_dump(),
        [a.model_dump() for a in atividades],
    )
    nome = f"relatorio_obra_{obra.cliente_nome.replace(' ', '_')}_{id}.pdf"
    return FileResponse(
        path,
        media_type="application/pdf",
        filename=nome,
        background=BackgroundTask(os.unlink, path),
    )
