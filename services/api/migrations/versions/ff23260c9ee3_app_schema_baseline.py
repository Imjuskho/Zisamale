"""app schema baseline (reconstituted)

Revision ID: ff23260c9ee3
Revises:
Create Date: 2026-08-30 02:12:21.194043

This is the single source of truth for the APPLICATION schema. It replaces
an earlier, broken lineage whose upgrade emitted only PostGIS tiger/zip
dictionary tables and whose downgrade referenced FKs on app tables it never
created.

Because historical databases were built with ``create_all`` (and drifted
from the models before the CHW-owner refactor), ``upgrade`` is deliberately
idempotent:

* missing app tables are created from the mapped metadata
  (``Base.metadata.create_all(checkfirst=True)``);
* legacy drift is healed with guarded ALTERs: ``visits.chw_id`` and
  ``pregnancies.chw_id`` were ``varchar`` (the latter including a ``''``
  default) and are cast to ``uuid``; ``audit_log.user_id`` was a ``uuid``
  with an FK to ``users`` and becomes a plain ``varchar(255)`` opaque actor
  id (JWT ``sub`` is not necessarily a DB UUID).

A fresh database reaches head by running ``alembic upgrade head`` from an
empty state; an existing database merely needs ``alembic upgrade head`` too
— no manual psql repair is ever required again.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'ff23260c9ee3'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)

    # Create any missing app tables (dependency order handled by SQLAlchemy).
    import app.models  # noqa: F401  (registers every mapper on Base.metadata)
    from app.database import Base
    Base.metadata.create_all(bind=bind, checkfirst=True)

    # ---- Legacy drift repair (idempotent) ----
    column_types = {
        name: {c["name"]: str(c["type"]) for c in insp.get_columns(name)}
        for name in ("visits", "pregnancies", "audit_log")
    }
    for table in ("visits", "pregnancies"):
        if "chw_id" in column_types[table] and "UUID" not in column_types[table]["chw_id"]:
            op.execute(f"ALTER TABLE {table} ALTER COLUMN chw_id TYPE uuid USING chw_id::uuid")
            op.execute(f"ALTER TABLE {table} ALTER COLUMN chw_id DROP DEFAULT")
    audit_fks = {fk["name"] for fk in insp.get_foreign_keys("audit_log")}
    if "audit_log_user_id_fkey" in audit_fks:
        op.execute("ALTER TABLE audit_log DROP CONSTRAINT audit_log_user_id_fkey")
    if "user_id" in column_types["audit_log"] and "UUID" in column_types["audit_log"]["user_id"]:
        op.execute("ALTER TABLE audit_log ALTER COLUMN user_id TYPE varchar(255)")


def downgrade() -> None:
    op.drop_table('visits')
    op.drop_table('villages')
    op.drop_table('users')
    op.drop_table('traditional_birth_attendants')
    op.drop_table('traditional_authorities')
    op.drop_table('surveillance_weekly')
    op.drop_table('supply_trucks')
    op.drop_table('stockout_history')
    op.drop_table('self_care_guides')
    op.drop_table('research_studies')
    op.drop_table('referrals')
    op.drop_table('pregnancies')
    op.drop_table('model_telemetry')
    op.drop_table('ml_models')
    op.drop_table('mental_health_referrals')
    op.drop_table('maternity_waiting_homes')
    op.drop_table('knowledge_deployments')
    op.drop_table('knowledge_assets')
    op.drop_table('households')
    op.drop_table('facility_stock')
    op.drop_table('facilities')
    op.drop_table('districts')
    op.drop_table('community_pins')
    op.drop_table('community_health_talks')
    op.drop_table('commodities')
    op.drop_table('cold_chain_units')
    op.drop_table('climate_daily')
    op.drop_table('children')
    op.drop_table('audit_log')
    op.drop_table('alerts')
    for enum_name in (
        'asset_status', 'asset_type', 'consent_status', 'content_severity',
        'delivery_method', 'guide_severity', 'mh_referral_status',
        'response_status', 'study_status', 'talk_status', 'userrole',
    ):
        op.execute(f"DROP TYPE IF EXISTS {enum_name}")