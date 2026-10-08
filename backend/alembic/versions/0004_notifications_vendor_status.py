from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

        ALTER TABLE vendors ADD COLUMN IF NOT EXISTS status varchar(16) NOT NULL DEFAULT 'approved';
        ALTER TABLE vendors ADD COLUMN IF NOT EXISTS contact_email varchar(255);
        ALTER TABLE vendors ADD COLUMN IF NOT EXISTS phone varchar(64);
        ALTER TABLE vendors ADD COLUMN IF NOT EXISTS website varchar(255);

        CREATE TABLE IF NOT EXISTS notifications (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            kind varchar(32) NOT NULL DEFAULT 'info',
            title varchar(255) NOT NULL,
            body text,
            link varchar(512),
            is_read boolean NOT NULL DEFAULT false,
            created_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS ix_notifications_user_unread
            ON notifications(user_id, is_read, created_at DESC);
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DROP TABLE IF EXISTS notifications;
        ALTER TABLE vendors DROP COLUMN IF EXISTS website;
        ALTER TABLE vendors DROP COLUMN IF EXISTS phone;
        ALTER TABLE vendors DROP COLUMN IF EXISTS contact_email;
        ALTER TABLE vendors DROP COLUMN IF EXISTS status;
        ALTER TABLE users DROP COLUMN IF EXISTS is_active;
        """
    )
