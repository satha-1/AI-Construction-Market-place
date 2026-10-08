from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # pgcrypto is bundled with PostgreSQL. pgvector is not installed on a
    # stock Windows server, so embeddings are stored as double precision[]
    # and ranked in application code.
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")


def downgrade() -> None:
    op.execute("DROP EXTENSION IF EXISTS vector")
