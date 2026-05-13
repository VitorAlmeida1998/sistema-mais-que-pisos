"""Testes: auditoria automática de entidades financeiras."""
from decimal import Decimal
from datetime import date

from app.models.atividade import Atividade, StatusAtividade
from app.models.audit_log import AuditLog
from app.schemas.atividade import AtividadeCreate
from app.services.atividade import AtividadeService
from app.utils.audit_listener import set_audit_user
from sqlalchemy import select


def test_criar_atividade_gera_audit_log(db, instalador, obra, servico, admin_user):
    """Criar uma atividade deve gerar entrada CREATE no audit_log."""
    set_audit_user(admin_user.id)
    svc = AtividadeService(db)
    atividade = svc.criar(
        AtividadeCreate(
            instalador_id=instalador.id,
            obra_id=obra.id,
            servico_id=servico.id,
            quantidade=Decimal("5"),
            data_execucao=date(2025, 1, 10),
        ),
        usuario_id=admin_user.id,
    )

    logs = list(db.execute(
        select(AuditLog)
        .where(AuditLog.entidade == "atividades", AuditLog.acao == "CREATE")
    ).scalars().all())

    assert len(logs) >= 1
    log = next((l for l in logs if l.entidade_id == atividade.id), None)
    assert log is not None
    assert log.usuario_id == admin_user.id
    assert log.dados_depois is not None
    assert log.dados_depois["id"] == atividade.id


def test_aprovar_atividade_gera_audit_update(db, instalador, obra, servico, admin_user):
    """Aprovar uma atividade deve gerar entrada UPDATE no audit_log."""
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

    logs = list(db.execute(
        select(AuditLog)
        .where(
            AuditLog.entidade == "atividades",
            AuditLog.acao == "UPDATE",
            AuditLog.entidade_id == atividade.id,
        )
    ).scalars().all())

    assert len(logs) >= 1


def test_adiantamento_gera_audit_log(db, instalador, admin_user):
    """Criar adiantamento deve gerar entrada CREATE no audit_log."""
    from app.models.adiantamento import Adiantamento
    from app.schemas.adiantamento import AdiantamentoCreate
    from app.services.adiantamento import AdiantamentoService

    svc = AdiantamentoService(db)
    adt = svc.criar(
        AdiantamentoCreate(
            instalador_id=instalador.id,
            valor=Decimal("150.00"),
            data=date(2025, 1, 5),
            descricao="Teste audit",
        ),
        usuario_id=admin_user.id,
    )

    logs = list(db.execute(
        select(AuditLog)
        .where(AuditLog.entidade == "adiantamentos", AuditLog.acao == "CREATE")
    ).scalars().all())

    assert len(logs) >= 1
