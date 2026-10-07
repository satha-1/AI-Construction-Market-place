from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_roles
from app.db.session import get_db
from app.models.project import Project
from app.models.user import User
from app.modules.audit.service import audit_logger
from app.schemas import ProjectCreate, ProjectOut, ProjectUpdate

router = APIRouter(prefix="/api/projects", tags=["projects"])

ALLOWED_STATUS = {"draft", "analyzing", "estimated", "sourcing", "quoted", "closed"}


def _can_access(user: User, project: Project) -> bool:
    return user.role == "admin" or project.owner_id == user.id


@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: ProjectCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("customer", "admin")),
):
    project = Project(
        owner_id=user.id,
        name=payload.name,
        description=payload.description,
        budget_cap=payload.budget_cap,
        location=payload.location,
        status="draft",
    )
    db.add(project)
    db.flush()
    audit_logger.log_event(
        db,
        actor_type="human",
        action="project.create",
        entity_type="projects",
        entity_id=project.id,
        user_id=user.id,
        project_id=project.id,
        after={"name": project.name, "status": project.status},
    )
    db.commit()
    db.refresh(project)
    return project


@router.get("", response_model=list[ProjectOut])
def list_projects(
    owner: str | None = "me",
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = select(Project).order_by(Project.created_at.desc())
    if user.role != "admin" or owner == "me":
        stmt = stmt.where(Project.owner_id == user.id)
    return db.scalars(stmt).all()


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(
    project_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    if not _can_access(user, project):
        raise HTTPException(status_code=403, detail="Forbidden")
    return project


@router.patch("/{project_id}", response_model=ProjectOut)
def update_project(
    project_id: UUID,
    payload: ProjectUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    if not _can_access(user, project):
        raise HTTPException(status_code=403, detail="Forbidden")
    before = {"name": project.name, "status": project.status}
    if payload.name is not None:
        project.name = payload.name
    if payload.description is not None:
        project.description = payload.description
    if payload.budget_cap is not None:
        project.budget_cap = payload.budget_cap
    if payload.location is not None:
        project.location = payload.location
    if payload.status is not None:
        if payload.status not in ALLOWED_STATUS:
            raise HTTPException(status_code=400, detail="Invalid status")
        project.status = payload.status
    audit_logger.log_event(
        db,
        actor_type="human",
        action="project.update",
        entity_type="projects",
        entity_id=project.id,
        user_id=user.id,
        project_id=project.id,
        before=before,
        after={"name": project.name, "status": project.status},
    )
    db.commit()
    db.refresh(project)
    return project
