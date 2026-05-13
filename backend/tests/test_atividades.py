"""Testes: criação e aprovação de atividades, snapshot de valor."""
from decimal import Decimal
from datetime import date

import pytest

from app.schemas.atividade import AtividadeCreate, AtividadeUpdate
from app.services.atividade import AtividadeService
from app.models.atividade import StatusAtividade


def test_criar_atividade_calcula_valor_snapshot(db, instalador, obra, servico, admin_user):
    """valor_calculado = servico.valor_unitario * quantidade, gravado no momento da criação."""
    svc = AtividadeService(db)
    atividade = svc.criar(
        AtividadeCreate(
            instalador_id=instalador.id,
            obra_id=obra.id,
            servico_id=servico.id,
            quantidade=Decimal("8.5"),
            data_execucao=date(2025, 1, 10),
        ),
        usuario_id=admin_user.id,
    )

    expected = Decimal("35.00") * Decimal("8.5")
    assert atividade.valor_calculado == expected


def test_atividade_criada_com_status_pendente(db, instalador, obra, servico, admin_user):
    svc = AtividadeService(db)
    atividade = svc.criar(
        AtividadeCreate(
            instalador_id=instalador.id,
            obra_id=obra.id,
            servico_id=servico.id,
            quantidade=Decimal("1"),
            data_execucao=date(2025, 1, 10),
        ),
        usuario_id=admin_user.id,
    )
    assert atividade.status == StatusAtividade.pendente


def test_aprovar_atividade(db, instalador, obra, servico, admin_user):
    svc = AtividadeService(db)
    atividade = svc.criar(
        AtividadeCreate(
            instalador_id=instalador.id,
            obra_id=obra.id,
            servico_id=servico.id,
            quantidade=Decimal("3"),
            data_execucao=date(2025, 1, 10),
        ),
        usuario_id=admin_user.id,
    )
    aprovada = svc.aprovar(atividade.id, admin_user.id)
    assert aprovada.status == StatusAtividade.aprovada
    assert aprovada.aprovador_id == admin_user.id


def test_nao_pode_aprovar_ja_aprovada(db, instalador, obra, servico, admin_user):
    from fastapi import HTTPException
    svc = AtividadeService(db)
    atividade = svc.criar(
        AtividadeCreate(
            instalador_id=instalador.id,
            obra_id=obra.id,
            servico_id=servico.id,
            quantidade=Decimal("3"),
            data_execucao=date(2025, 1, 10),
        ),
        usuario_id=admin_user.id,
    )
    svc.aprovar(atividade.id, admin_user.id)
    with pytest.raises(HTTPException) as exc_info:
        svc.aprovar(atividade.id, admin_user.id)
    assert exc_info.value.status_code == 400


def test_editar_atividade_recalcula_valor(db, instalador, obra, servico, admin_user):
    """Ao editar quantidade de atividade pendente, valor_calculado deve ser atualizado."""
    svc = AtividadeService(db)
    atividade = svc.criar(
        AtividadeCreate(
            instalador_id=instalador.id,
            obra_id=obra.id,
            servico_id=servico.id,
            quantidade=Decimal("4"),
            data_execucao=date(2025, 1, 10),
        ),
        usuario_id=admin_user.id,
    )
    atualizada = svc.atualizar(atividade.id, AtividadeUpdate(quantidade=Decimal("10")), admin_user.id)
    assert atualizada.valor_calculado == Decimal("350.00")


def test_nao_pode_editar_atividade_aprovada(db, instalador, obra, servico, admin_user):
    from fastapi import HTTPException
    svc = AtividadeService(db)
    atividade = svc.criar(
        AtividadeCreate(
            instalador_id=instalador.id,
            obra_id=obra.id,
            servico_id=servico.id,
            quantidade=Decimal("4"),
            data_execucao=date(2025, 1, 10),
        ),
        usuario_id=admin_user.id,
    )
    svc.aprovar(atividade.id, admin_user.id)
    with pytest.raises(HTTPException) as exc_info:
        svc.atualizar(atividade.id, AtividadeUpdate(quantidade=Decimal("10")), admin_user.id)
    assert exc_info.value.status_code == 400
