from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.audit import AuditLog
from app.models.project import Project
from app.models.user import User
from app.schemas import AuditLogOut

router = APIRouter(prefix="/api/projects", tags=["audit"])


@router.get("/{project_id}/audit-log", response_model=list[AuditLogOut])
def list_audit_log(
    project_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    if user.role != "admin" and project.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    rows = db.scalars(
        select(AuditLog).where(AuditLog.project_id == project_id).order_by(AuditLog.created_at.desc())
    ).all()
    return rows
