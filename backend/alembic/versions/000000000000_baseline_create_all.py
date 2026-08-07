"""Baseline: crear todas las tablas desde los modelos

Revision ID: 000000000000
Revises: None
Create Date: 2026-05-17 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '000000000000'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    # Crear todas las tablas según las declaraciones de los modelos
    from database.bases import Base
    Base.metadata.create_all(bind=bind)


def downgrade():
    bind = op.get_bind()
    from database.bases import Base
    Base.metadata.drop_all(bind=bind)
