"""Merge baseline and db0 migration branches

Revision ID: 54c93ce3d165
Revises: 000000000000, db0e902cb800
Create Date: 2026-05-19 00:00:00.000000

"""

from typing import Sequence, Union


# revision identifiers, used by Alembic.
revision: str = "54c93ce3d165"
down_revision: Union[str, Sequence[str], None] = ("000000000000", "db0e902cb800")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass