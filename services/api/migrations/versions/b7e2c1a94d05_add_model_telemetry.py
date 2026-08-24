"""add model_telemetry table

Revision ID: b7e2c1a94d05
Revises: fd3a4ce5480f
Create Date: 2026-08-24 02:10:00.000000

Edge inference telemetry reported by the Android app (M3 contract delta).
The dev database had this table created via Base.metadata.create_all; this
migration makes the schema reproducible in staging/prod.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = 'b7e2c1a94d05'
down_revision: Union[str, None] = 'fd3a4ce5480f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'model_telemetry',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('chw_id', sa.String(length=64), nullable=True),
        sa.Column('device_id', sa.String(length=128), nullable=True),
        sa.Column('kind', sa.String(length=20), nullable=False),
        sa.Column('model_version', sa.String(length=50), nullable=False),
        sa.Column('source', sa.String(length=20), nullable=False),
        sa.Column('inference_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('fallback_count', sa.Integer(), server_default='0', nullable=False),
        sa.Column('latency_ms_avg', sa.Float(), nullable=True),
        sa.Column('app_version', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(
        'ix_model_telemetry_chw_id', 'model_telemetry', ['chw_id'], unique=False
    )
    op.create_index(
        'ix_model_telemetry_created_at', 'model_telemetry', ['created_at'], unique=False
    )


def downgrade() -> None:
    op.drop_index('ix_model_telemetry_created_at', table_name='model_telemetry')
    op.drop_index('ix_model_telemetry_chw_id', table_name='model_telemetry')
    op.drop_table('model_telemetry')
