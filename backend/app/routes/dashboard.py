from datetime import date
from decimal import Decimal
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.instalador import Instalador
from app.models.pagamento import Pagamento
from app.models.usuario import Usuario
from app.repositories.instalador import InstaladorRepository
from app.repositories.obra import ObraRepository
from app.repositories.atividade import AtividadeRepository
from app.utils.auth import get_current_user

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

MESES_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]


def _add_meses(d: date, n: int) -> date:
    total = d.year * 12 + (d.month - 1) + n
    return date(total // 12, total % 12 + 1, 1)


class DashboardResponse(BaseModel):
    instaladores_ativos: int
    obras_em_andamento: int
    atividades_pendentes_aprovacao: int
    valor_previsto_pagamento: Decimal


class RankingItem(BaseModel):
    instalador_id: int
    instalador_nome: str
    total_liquido: Decimal
    qtd_pagamentos: int


class DashboardMensalItem(BaseModel):
    mes: str
    label: str
    valor_pago: Decimal
    valor_adiantamentos: Decimal
    qtd_pagamentos: int


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


@router.get("/mensal", response_model=list[DashboardMensalItem])
def dashboard_mensal(
    meses: int = Query(6, ge=1, le=24),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> list[DashboardMensalItem]:
    hoje = date.today()
    inicio = _add_meses(date(hoje.year, hoje.month, 1), -(meses - 1))

    rows = db.execute(
        select(
            func.date_trunc("month", Pagamento.criado_em).label("mes"),
            func.sum(Pagamento.valor_liquido).label("valor_pago"),
            func.sum(Pagamento.valor_adiantamentos).label("valor_adiantamentos"),
            func.count(Pagamento.id).label("qtd_pagamentos"),
        )
        .where(Pagamento.criado_em >= inicio)
        .group_by(func.date_trunc("month", Pagamento.criado_em))
        .order_by(func.date_trunc("month", Pagamento.criado_em))
    ).all()

    data_map: dict[str, dict] = {}
    for row in rows:
        m = row.mes.date() if hasattr(row.mes, "date") else row.mes
        key = m.strftime("%Y-%m")
        data_map[key] = {
            "valor_pago": Decimal(str(row.valor_pago or 0)),
            "valor_adiantamentos": Decimal(str(row.valor_adiantamentos or 0)),
            "qtd_pagamentos": int(row.qtd_pagamentos or 0),
        }

    result = []
    for i in range(meses):
        d = _add_meses(inicio, i)
        key = d.strftime("%Y-%m")
        item = data_map.get(key, {"valor_pago": Decimal("0"), "valor_adiantamentos": Decimal("0"), "qtd_pagamentos": 0})
        result.append(DashboardMensalItem(
            mes=key,
            label=f"{MESES_PT[d.month - 1]}/{str(d.year)[2:]}",
            **item,
        ))

    return result


@router.get("/ranking", response_model=list[RankingItem])
def dashboard_ranking(
    limite: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
) -> list[RankingItem]:
    rows = db.execute(
        select(
            Pagamento.instalador_id,
            Instalador.nome,
            func.sum(Pagamento.valor_liquido).label("total_liquido"),
            func.count(Pagamento.id).label("qtd_pagamentos"),
        )
        .join(Instalador, Instalador.id == Pagamento.instalador_id)
        .group_by(Pagamento.instalador_id, Instalador.nome)
        .order_by(func.sum(Pagamento.valor_liquido).desc())
        .limit(limite)
    ).all()

    return [
        RankingItem(
            instalador_id=row.instalador_id,
            instalador_nome=row.nome,
            total_liquido=Decimal(str(row.total_liquido or 0)),
            qtd_pagamentos=int(row.qtd_pagamentos or 0),
        )
        for row in rows
    ]
