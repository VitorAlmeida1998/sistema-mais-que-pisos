"""Testes: cálculo de pagamento e desconto de adiantamentos."""
from decimal import Decimal
from datetime import date

import pytest

from app.models.atividade import Atividade, StatusAtividade
from app.models.adiantamento import Adiantamento
from app.schemas.pagamento import PagamentoPreviewRequest, PagamentoCreate
from app.services.pagamento import PagamentoService


def test_preview_calcula_valor_bruto_corretamente(db, instalador, obra, servico, admin_user):
    """valor_bruto = soma dos valor_calculado das atividades aprovadas."""
    a1 = Atividade(
        instalador_id=instalador.id,
        obra_id=obra.id,
        servico_id=servico.id,
        quantidade=Decimal("10"),
        data_execucao=date(2025, 1, 6),
        valor_calculado=Decimal("350.00"),
        status=StatusAtividade.aprovada,
    )
    a2 = Atividade(
        instalador_id=instalador.id,
        obra_id=obra.id,
        servico_id=servico.id,
        quantidade=Decimal("5"),
        data_execucao=date(2025, 1, 7),
        valor_calculado=Decimal("175.00"),
        status=StatusAtividade.aprovada,
    )
    db.add_all([a1, a2])
    db.commit()

    svc = PagamentoService(db)
    preview = svc.preview(PagamentoPreviewRequest(
        instalador_id=instalador.id,
        semana_inicio=date(2025, 1, 6),
        semana_fim=date(2025, 1, 12),
    ))

    assert preview.valor_bruto == Decimal("525.00")
    assert preview.valor_adiantamentos == Decimal("0")
    assert preview.valor_liquido == Decimal("525.00")


def test_preview_desconta_adiantamentos_pendentes(db, instalador, obra, servico, admin_user):
    """valor_liquido = valor_bruto - adiantamentos pendentes."""
    a = Atividade(
        instalador_id=instalador.id,
        obra_id=obra.id,
        servico_id=servico.id,
        quantidade=Decimal("10"),
        data_execucao=date(2025, 1, 6),
        valor_calculado=Decimal("350.00"),
        status=StatusAtividade.aprovada,
    )
    adt = Adiantamento(
        instalador_id=instalador.id,
        valor=Decimal("100.00"),
        data=date(2025, 1, 4),
        descricao="Adiantamento semana",
        criado_por=admin_user.id,
    )
    db.add_all([a, adt])
    db.commit()

    svc = PagamentoService(db)
    preview = svc.preview(PagamentoPreviewRequest(
        instalador_id=instalador.id,
        semana_inicio=date(2025, 1, 6),
        semana_fim=date(2025, 1, 12),
    ))

    assert preview.valor_bruto == Decimal("350.00")
    assert preview.valor_adiantamentos == Decimal("100.00")
    assert preview.valor_liquido == Decimal("250.00")


def test_valor_liquido_nao_negativo(db, instalador, obra, servico, admin_user):
    """valor_liquido nunca deve ser negativo mesmo com adiantamento maior."""
    a = Atividade(
        instalador_id=instalador.id,
        obra_id=obra.id,
        servico_id=servico.id,
        quantidade=Decimal("2"),
        data_execucao=date(2025, 1, 6),
        valor_calculado=Decimal("70.00"),
        status=StatusAtividade.aprovada,
    )
    adt = Adiantamento(
        instalador_id=instalador.id,
        valor=Decimal("200.00"),
        data=date(2025, 1, 4),
        criado_por=admin_user.id,
    )
    db.add_all([a, adt])
    db.commit()

    svc = PagamentoService(db)
    preview = svc.preview(PagamentoPreviewRequest(
        instalador_id=instalador.id,
        semana_inicio=date(2025, 1, 6),
        semana_fim=date(2025, 1, 12),
    ))

    assert preview.valor_liquido == Decimal("0")


def test_efetivar_pagamento_muda_status_atividades(db, instalador, obra, servico, admin_user):
    """Após pagamento efetivado, atividades ficam com status 'paga'."""
    a = Atividade(
        instalador_id=instalador.id,
        obra_id=obra.id,
        servico_id=servico.id,
        quantidade=Decimal("5"),
        data_execucao=date(2025, 1, 6),
        valor_calculado=Decimal("175.00"),
        status=StatusAtividade.aprovada,
    )
    db.add(a)
    db.commit()
    db.refresh(a)
    ativ_id = a.id

    svc = PagamentoService(db)
    pagamento = svc.efetivar(
        PagamentoCreate(
            instalador_id=instalador.id,
            semana_inicio=date(2025, 1, 6),
            semana_fim=date(2025, 1, 12),
        ),
        usuario_id=admin_user.id,
    )

    db.expire_all()
    ativ_atualizada = db.get(Atividade, ativ_id)
    assert ativ_atualizada is not None
    assert ativ_atualizada.status == StatusAtividade.paga
    assert ativ_atualizada.pagamento_id == pagamento.id


def test_efetivar_pagamento_quita_adiantamentos(db, instalador, obra, servico, admin_user):
    """Após pagamento, adiantamentos ficam com pagamento_id preenchido."""
    a = Atividade(
        instalador_id=instalador.id,
        obra_id=obra.id,
        servico_id=servico.id,
        quantidade=Decimal("10"),
        data_execucao=date(2025, 1, 6),
        valor_calculado=Decimal("350.00"),
        status=StatusAtividade.aprovada,
    )
    adt = Adiantamento(
        instalador_id=instalador.id,
        valor=Decimal("50.00"),
        data=date(2025, 1, 4),
        criado_por=admin_user.id,
    )
    db.add_all([a, adt])
    db.commit()
    db.refresh(adt)
    adt_id = adt.id

    svc = PagamentoService(db)
    pagamento = svc.efetivar(
        PagamentoCreate(
            instalador_id=instalador.id,
            semana_inicio=date(2025, 1, 6),
            semana_fim=date(2025, 1, 12),
        ),
        usuario_id=admin_user.id,
    )

    db.expire_all()
    adt_atualizado = db.get(Adiantamento, adt_id)
    assert adt_atualizado is not None
    assert adt_atualizado.pagamento_id == pagamento.id


def test_preview_ignora_atividades_pendentes(db, instalador, obra, servico, admin_user):
    """Atividades pendentes não entram no cálculo do pagamento."""
    a_pend = Atividade(
        instalador_id=instalador.id,
        obra_id=obra.id,
        servico_id=servico.id,
        quantidade=Decimal("10"),
        data_execucao=date(2025, 1, 6),
        valor_calculado=Decimal("350.00"),
        status=StatusAtividade.pendente,
    )
    a_aprov = Atividade(
        instalador_id=instalador.id,
        obra_id=obra.id,
        servico_id=servico.id,
        quantidade=Decimal("2"),
        data_execucao=date(2025, 1, 6),
        valor_calculado=Decimal("70.00"),
        status=StatusAtividade.aprovada,
    )
    db.add_all([a_pend, a_aprov])
    db.commit()

    svc = PagamentoService(db)
    preview = svc.preview(PagamentoPreviewRequest(
        instalador_id=instalador.id,
        semana_inicio=date(2025, 1, 6),
        semana_fim=date(2025, 1, 12),
    ))

    assert preview.valor_bruto == Decimal("70.00")
    assert len(preview.atividades) == 1
