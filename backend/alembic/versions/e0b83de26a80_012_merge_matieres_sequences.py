"""012_merge_matieres_sequences

Revision ID: e0b83de26a80
Revises: 011_matieres_enrichies, 011_sequences_evaluation
Create Date: 2026-06-12 12:33:28.267647

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e0b83de26a80'
down_revision: Union[str, Sequence[str], None] = ('011_matieres_enrichies', '011_sequences_evaluation')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
