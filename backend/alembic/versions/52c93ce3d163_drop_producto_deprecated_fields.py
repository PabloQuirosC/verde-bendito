"""drop producto deprecated fields

Revision ID: 52c93ce3d163
Revises: 51c93ce3d162
Create Date: 2026-05-09 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "52c93ce3d163"
down_revision: Union[str, Sequence[str], None] = "51c93ce3d162"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("producto", "sku")
    op.drop_column("producto", "descripcion")
    op.drop_column("producto", "costo")
    op.drop_column("producto", "stock_maximo")
    op.drop_column("producto", "imagen_url")
    op.drop_column("producto", "codigo_barras")
    op.drop_column("producto", "requiere_cantidad_frac")
    op.drop_column("producto", "es_combo")
    op.drop_column("producto", "tiempo_prep")


def downgrade() -> None:
    op.add_column("producto", sa.Column("tiempo_prep", sa.Integer(), nullable=True))
    op.add_column("producto", sa.Column("es_combo", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("producto", sa.Column("requiere_cantidad_frac", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("producto", sa.Column("codigo_barras", sa.String(length=100), nullable=True))
    op.add_column("producto", sa.Column("imagen_url", sa.String(length=500), nullable=True))
    op.add_column("producto", sa.Column("stock_maximo", sa.Integer(), nullable=False, server_default="100"))
    op.add_column("producto", sa.Column("costo", sa.Numeric(precision=10, scale=2), nullable=True))
    op.add_column("producto", sa.Column("descripcion", sa.Text(), nullable=True))
    op.add_column("producto", sa.Column("sku", sa.String(length=50), nullable=True))