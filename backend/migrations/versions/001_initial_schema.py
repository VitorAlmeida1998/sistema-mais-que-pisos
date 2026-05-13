"""Initial schema

Revision ID: 001
Revises:
Create Date: 2026-01-01 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB
from alembic import op

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Nota: sa.Enum com name= cria o tipo PostgreSQL ENUM automaticamente
    # na primeira tabela que o referencia. Tabelas seguintes reutilizam o tipo existente.

    op.create_table(
        "usuarios",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("nome", sa.String(150), nullable=False),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("senha_hash", sa.String(255), nullable=False),
        sa.Column(
            "papel",
            sa.Enum("admin", "gestor", "visualizador", name="papel_usuario"),
            nullable=False,
        ),
        sa.Column("ativo", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("criado_em", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_usuarios_email", "usuarios", ["email"])

    op.create_table(
        "instaladores",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("nome", sa.String(150), nullable=False),
        sa.Column("cpf", sa.String(14), nullable=False, unique=True),
        sa.Column("telefone", sa.String(20)),
        sa.Column("chave_pix", sa.String(255)),
        sa.Column("banco", sa.String(100)),
        sa.Column("agencia", sa.String(20)),
        sa.Column("conta", sa.String(30)),
        sa.Column("eh_mei", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("cnpj_mei", sa.String(18)),
        sa.Column("ativo", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("observacoes", sa.Text),
        sa.Column("criado_em", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_instaladores_cpf", "instaladores", ["cpf"])

    op.create_table(
        "obras",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("cliente_nome", sa.String(200), nullable=False),
        sa.Column("endereco", sa.String(500), nullable=False),
        sa.Column("data_inicio", sa.Date, nullable=False),
        sa.Column("data_fim_prevista", sa.Date),
        sa.Column(
            "status",
            sa.Enum("em_andamento", "concluida", "cancelada", name="status_obra"),
            nullable=False,
        ),
        sa.Column("ativo", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("observacoes", sa.Text),
        sa.Column("criado_em", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "servicos",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("descricao", sa.String(300), nullable=False),
        sa.Column(
            "unidade",
            sa.Enum("m2", "unidade", "diaria", "metro_linear", name="unidade_servico"),
            nullable=False,
        ),
        sa.Column("valor_unitario", sa.Numeric(12, 2), nullable=False),
        sa.Column("ativo", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("criado_em", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "pagamentos",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("instalador_id", sa.Integer, sa.ForeignKey("instaladores.id"), nullable=False),
        sa.Column("semana_inicio", sa.Date, nullable=False),
        sa.Column("semana_fim", sa.Date, nullable=False),
        sa.Column("valor_bruto", sa.Numeric(12, 2), nullable=False),
        sa.Column("valor_adiantamentos", sa.Numeric(12, 2), nullable=False, server_default="0"),
        sa.Column("valor_liquido", sa.Numeric(12, 2), nullable=False),
        sa.Column("data_pagamento", sa.Date),
        sa.Column("comprovante_pdf_path", sa.String(500)),
        sa.Column("criado_por", sa.Integer, sa.ForeignKey("usuarios.id"), nullable=False),
        sa.Column("criado_em", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_pagamentos_instalador_id", "pagamentos", ["instalador_id"])

    op.create_table(
        "atividades",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("instalador_id", sa.Integer, sa.ForeignKey("instaladores.id"), nullable=False),
        sa.Column("obra_id", sa.Integer, sa.ForeignKey("obras.id"), nullable=False),
        sa.Column("servico_id", sa.Integer, sa.ForeignKey("servicos.id"), nullable=False),
        sa.Column("quantidade", sa.Numeric(12, 3), nullable=False),
        sa.Column("data_execucao", sa.Date, nullable=False),
        sa.Column("valor_calculado", sa.Numeric(12, 2), nullable=False),
        sa.Column(
            "status",
            sa.Enum("pendente", "aprovada", "paga", name="status_atividade"),
            nullable=False,
            server_default="pendente",
        ),
        sa.Column("aprovador_id", sa.Integer, sa.ForeignKey("usuarios.id")),
        sa.Column("observacao", sa.Text),
        sa.Column("pagamento_id", sa.Integer, sa.ForeignKey("pagamentos.id")),
        sa.Column("criado_em", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_atividades_instalador_id", "atividades", ["instalador_id"])
    op.create_index("ix_atividades_obra_id", "atividades", ["obra_id"])
    op.create_index("ix_atividades_status", "atividades", ["status"])

    op.create_table(
        "adiantamentos",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("instalador_id", sa.Integer, sa.ForeignKey("instaladores.id"), nullable=False),
        sa.Column("valor", sa.Numeric(12, 2), nullable=False),
        sa.Column("data", sa.Date, nullable=False),
        sa.Column("descricao", sa.Text),
        sa.Column("pagamento_id", sa.Integer, sa.ForeignKey("pagamentos.id")),
        sa.Column("criado_por", sa.Integer, sa.ForeignKey("usuarios.id"), nullable=False),
        sa.Column("criado_em", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_adiantamentos_instalador_id", "adiantamentos", ["instalador_id"])

    op.create_table(
        "audit_log",
        sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
        sa.Column("usuario_id", sa.Integer, sa.ForeignKey("usuarios.id")),
        sa.Column("acao", sa.String(10), nullable=False),
        sa.Column("entidade", sa.String(100), nullable=False),
        sa.Column("entidade_id", sa.Integer),
        sa.Column("dados_antes", JSONB),
        sa.Column("dados_depois", JSONB),
        sa.Column("timestamp", sa.DateTime, nullable=False, server_default=sa.func.now()),
    )
    op.create_index("ix_audit_log_entidade", "audit_log", ["entidade"])
    op.create_index("ix_audit_log_timestamp", "audit_log", ["timestamp"])
    op.create_index("ix_audit_log_acao", "audit_log", ["acao"])


def downgrade() -> None:
    op.drop_table("audit_log")
    op.drop_table("adiantamentos")
    op.drop_table("atividades")
    op.drop_table("pagamentos")
    op.drop_table("servicos")
    op.drop_table("obras")
    op.drop_table("instaladores")
    op.drop_table("usuarios")
    sa.Enum(name="status_atividade").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="unidade_servico").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="status_obra").drop(op.get_bind(), checkfirst=True)
    sa.Enum(name="papel_usuario").drop(op.get_bind(), checkfirst=True)
