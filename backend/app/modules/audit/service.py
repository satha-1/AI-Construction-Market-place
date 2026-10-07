from uuid import UUID

from sqlalchemy.orm import Session

from app.models.audit import AuditLog


class AuditLogger:
    def log_event(
        self,
        db: Session,
        *,
        actor_type: str,
        action: str,
        entity_type: str,
        entity_id: UUID | None = None,
        user_id: UUID | None = None,
        project_id: UUID | None = None,
        before: dict | None = None,
        after: dict | None = None,
        confidence_score=None,
        source_reference: str | None = None,
    ) -> AuditLog:
        row = AuditLog(
            project_id=project_id,
            user_id=user_id,
            actor_type=actor_type,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            before_value=before,
            after_value=after,
            confidence_score=confidence_score,
            source_reference=source_reference,
        )
        db.add(row)
        db.flush()
        return row


audit_logger = AuditLogger()
