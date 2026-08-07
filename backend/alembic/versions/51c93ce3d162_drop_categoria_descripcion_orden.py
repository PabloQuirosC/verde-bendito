"""drop categoria descripcion and orden

Revision ID: 51c93ce3d162
Revises: 50c93ce3d161
Create Date: 2026-05-09 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "51c93ce3d162"
down_revision: Union[str, Sequence[str], None] = "50c93ce3d161"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("categoria", "descripcion")
    op.drop_column("categoria", "orden")


def downgrade() -> None:
    op.add_column("categoria", sa.Column("orden", sa.Integer(), nullable=True))
    op.add_column("categoria", sa.Column("descripcion", sa.Text(), nullable=True))