"""add CHW ownership to child records

Revision ID: c91d7e4a2b60
Revises: e8f3a1c92d47
Create Date: 2026-08-28

Child records are catchment-scoped in the API. Persisting the owning CHW
makes that restriction enforceable in database queries as well. CHW identity
is a string in the existing child table, matching the sync contract and
avoiding a lossy conversion of deployed legacy records.
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c91d7e4a2b60"
down_revision: Union[str, None] = "e8f3a1c92d47"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    column_names = {column["name"] for column in inspector.get_columns("children")}
    index_names = {index["name"] for index in inspector.get_indexes("children")}

    if "chw_id" not in column_names:
        op.add_column("children", sa.Column("chw_id", sa.String(length=255), nullable=True))
    if "idx_children_chw" not in index_names:
        op.create_index("idx_children_chw", "children", ["chw_id"], unique=False)


def downgrade() -> None:
    op.drop_index("idx_children_chw", table_name="children")
    op.drop_column("children", "chw_id")
