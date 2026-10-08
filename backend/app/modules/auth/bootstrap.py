from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.models.user import User


def ensure_admin(db: Session) -> None:
    email = settings.admin_email.strip().lower()
    password = settings.admin_password
    if not email or not password:
        return
    existing = db.scalar(select(User).where(User.email == email))
    if existing is not None:
        if existing.role != "admin":
            existing.role = "admin"
            db.commit()
        return
    db.add(
        User(
            email=email,
            password_hash=hash_password(password),
            full_name="Marketplace Admin",
            role="admin",
        )
    )
    db.commit()
