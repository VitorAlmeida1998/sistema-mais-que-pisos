from fastapi import APIRouter, Depends, Query
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.usuario import Usuario
from app.schemas.pagamento import (
    PagamentoCreate, PagamentoPreviewRequest, PagamentoPreviewResponse, PagamentoResponse
)
from app.services.pagamento import PagamentoService
from app.utils.auth import get_current_user, require_papel
import os

router = APIRouter(prefix="/pagamentos", tags=["pagamentos"])


@router.post("/preview", response_model=PagamentoPreviewResponse)
def preview(
    data: PagamentoPreviewRequest,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_papel("admin", "gestor")),
) -> PagamentoPreviewResponse:
    return PagamentoService(db).preview(data)


@router.post("", response_model=PagamentoResponse, status_code=201)
def efetivar(
    data: PagamentoCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(require_papel("admin", "gestor")),
) -> PagamentoResponse:
    return PagamentoService(db).efetivar(data, current_user.id)


@router.get("", response_model=list[PagamentoResponse])
def listar(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> list[PagamentoResponse]:
    return PagamentoService(db).listar(skip, limit)


@router.get("/{id}/atividades", response_model=list)
def atividades_pagamento(
    id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> list:
    return PagamentoService(db).listar_atividades(id)


@router.get("/{id}/recibo")
def recibo(
    id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> FileResponse:
    svc = PagamentoService(db)
    pagamento = svc.obter(id)
    if not pagamento.comprovante_pdf_path or not os.path.exists(pagamento.comprovante_pdf_path):
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="PDF não disponível")
    return FileResponse(
        pagamento.comprovante_pdf_path,
        media_type="application/pdf",
        filename=f"recibo_pagamento_{id}.pdf",
    )
