"""add queue token ordering index

The most frequent queue query filters by (hospital, active status) and then
orders by priority_level descending and created_at ascending. This composite
index lets PostgreSQL satisfy both the filter and the sort without a separate
sort pass after the existing (hospital_id, status) index.

Revision ID: a1b2c3d4e5f6
Revises: 9a7c41d2bb10
Create Date: 2026-09-05 16:45:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '9a7c41d2bb10'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add the composite index backing the canonical queue ordering."""
    op.create_index(
        'ix_queue_tokens_hospital_status_priority',
        'queue_tokens',
        ['hospital_id', 'status', 'priority_level', 'created_at'],
        unique=False,
    )


def downgrade() -> None:
    """Remove the composite queue ordering index."""
    op.drop_index('ix_queue_tokens_hospital_status_priority', table_name='queue_tokens')