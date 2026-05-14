"""Add numero_pedido to obras

Revision ID: 002
Revises: 001
Create Date: 2026-05-13 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("obras", sa.Column("numero_pedido", sa.String(100), nullable=True))


def downgrade() -> None:
    op.drop_column("obras", "numero_pedido")
