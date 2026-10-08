from uuid import UUID

from sqlalchemy.orm import Session

from app.models.notification import Notification


def notify(
    db: Session,
    *,
    user_id: UUID,
    title: str,
    body: str | None = None,
    kind: str = "info",
    link: str | None = None,
) -> Notification:
    row = Notification(user_id=user_id, title=title, body=body, kind=kind, link=link)
    db.add(row)
    db.flush()
    return row
