"""Add prioridad to detalle_comanda

Revision ID: a1c2e3f4b5d6
Revises: f167095b7f12
Create Date: 2026-05-14 21:05:00.000000

"""
from alembic import op
import sqlalchemy as sa
from typing import Sequence, Union

# revision identifiers, used by Alembic.
revision: str = 'a1c2e3f4b5d6'
down_revision: Union[str, Sequence[str], None] = 'f167095b7f12'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add column with server_default to avoid locking issues on large tables
    op.add_column('detalle_comanda', sa.Column('prioridad', sa.String(length=20), nullable=False, server_default='media'))
    # Remove server_default so future inserts rely on model/defaults
    op.alter_column('detalle_comanda', 'prioridad', server_default=None)


def downgrade() -> None:
    op.drop_column('detalle_comanda', 'prioridad')
