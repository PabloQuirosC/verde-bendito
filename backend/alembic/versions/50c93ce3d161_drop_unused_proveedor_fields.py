"""drop unused proveedor fields

Revision ID: 50c93ce3d161
Revises: 49c93ce3d160
Create Date: 2026-05-08 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "50c93ce3d161"
down_revision = "49c93ce3d160"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_column("proveedor", "ciudad")
    op.drop_column("proveedor", "pais")
    op.drop_column("proveedor", "ruc")


def downgrade() -> None:
    op.add_column("proveedor", sa.Column("ruc", sa.String(length=50), nullable=True))
    op.add_column("proveedor", sa.Column("pais", sa.String(length=100), nullable=True))
    op.add_column("proveedor", sa.Column("ciudad", sa.String(length=100), nullable=True))
