"""add queue token case hospital unique constraint

An emergency case may only hold one queue token per hospital. This backs the
hospital-selection idempotency check against concurrent requests.

Revision ID: 9a7c41d2bb10
Revises: 3c284fd76226
Create Date: 2026-09-05 16:30:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '9a7c41d2bb10'
down_revision: Union[str, None] = '3c284fd76226'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add the case-per-hospital uniqueness guard."""
    op.create_unique_constraint(
        'uq_queue_token_case_hospital',
        'queue_tokens',
        ['emergency_case_id', 'hospital_id'],
    )


def downgrade() -> None:
    """Remove the case-per-hospital uniqueness guard."""
    op.drop_constraint(
        'uq_queue_token_case_hospital', 'queue_tokens', type_='unique'
    )