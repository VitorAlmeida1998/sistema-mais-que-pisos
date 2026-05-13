from decimal import Decimal
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.usuario import Usuario
from app.repositories.instalador import InstaladorRepository
from app.repositories.obra import ObraRepository
from app.repositories.atividade import AtividadeRepository
from app.utils.auth import get_current_user

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


class DashboardResponse(BaseModel):
    instaladores_ativos: int
    obras_em_andamento: int
    atividades_pendentes_aprovacao: int
    valor_previsto_pagamento: Decimal


@router.get("", response_model=DashboardResponse)
def dashboard(
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> DashboardResponse:
    return DashboardResponse(
        instaladores_ativos=InstaladorRepository(db).count_ativos(),
        obras_em_andamento=ObraRepository(db).count_em_andamento(),
        atividades_pendentes_aprovacao=AtividadeRepository(db).count_pendentes(),
        valor_previsto_pagamento=AtividadeRepository(db).sum_aprovadas(),
    )
