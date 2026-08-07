"""add ticket personalization fields to configuracion

Revision ID: 20260519_add_ticket_fields
Revises: 
Create Date: 2026-05-19 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20260519_add_ticket_fields'
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('configuracion', sa.Column('tagline', sa.String(length=200), nullable=True))
    op.add_column('configuracion', sa.Column('footer', sa.Text(), nullable=True))
    op.add_column('configuracion', sa.Column('show_logo', sa.Integer(), nullable=False, server_default='1'))
    op.add_column('configuracion', sa.Column('show_tax', sa.Integer(), nullable=False, server_default='1'))
    op.add_column('configuracion', sa.Column('show_service', sa.Integer(), nullable=False, server_default='1'))
    op.add_column('configuracion', sa.Column('show_qr', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('configuracion', sa.Column('accent', sa.String(length=20), nullable=False, server_default='verde'))


def downgrade():
    op.drop_column('configuracion', 'accent')
    op.drop_column('configuracion', 'show_qr')
    op.drop_column('configuracion', 'show_service')
    op.drop_column('configuracion', 'show_tax')
    op.drop_column('configuracion', 'show_logo')
    op.drop_column('configuracion', 'footer')
    op.drop_column('configuracion', 'tagline')
