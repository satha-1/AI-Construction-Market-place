from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.deps import require_roles
from app.db.session import get_db
from app.models.project import Project
from app.models.reference import ReferenceItem, ReferenceRate
from app.models.user import User
from app.models.vendor import Vendor
from app.models.verification import UncertaintyFlag
from app.modules.audit.service import audit_logger
from app.schemas import (
    AdminOverview,
    AdminProjectOut,
    AdminRateOut,
    RateUpdate,
    RoleUpdate,
    UserOut,
)

router = APIRouter(prefix="/api/admin", tags=["admin"])


def _count(db: Session, model, *filters) -> int:
    stmt = select(func.count()).select_from(model)
    for clause in filters:
        stmt = stmt.where(clause)
    return int(db.scalar(stmt) or 0)


@router.get("/overview", response_model=AdminOverview)
def overview(db: Session = Depends(get_db), _: User = Depends(require_roles("admin"))):
    return AdminOverview(
        users=_count(db, User),
        customers=_count(db, User, User.role == "customer"),
        vendors=_count(db, User, User.role == "vendor"),
        admins=_count(db, User, User.role == "admin"),
        projects=_count(db, Project),
        vendor_profiles=_count(db, Vendor),
        open_flags=_count(db, UncertaintyFlag, UncertaintyFlag.status == "open"),
    )


@router.get("/users", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), _: User = Depends(require_roles("admin"))):
    return db.scalars(select(User).order_by(User.created_at.desc())).all()


@router.patch("/users/{user_id}", response_model=UserOut)
def update_user_role(
    user_id: UUID,
    payload: RoleUpdate,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles("admin")),
):
    target = db.get(User, user_id)
    if target is None:
        raise HTTPException(status_code=404, detail="User not found")
    if target.id == actor.id and payload.role != "admin":
        raise HTTPException(status_code=400, detail="You cannot remove your own admin role")
    if target.role == "admin" and payload.role != "admin":
        admins = _count(db, User, User.role == "admin")
        if admins <= 1:
            raise HTTPException(status_code=400, detail="At least one admin is required")
    before = target.role
    target.role = payload.role
    audit_logger.log_event(
        db,
        actor_type="human",
        action="user.role_change",
        entity_type="users",
        entity_id=target.id,
        user_id=actor.id,
        before={"role": before},
        after={"role": target.role},
    )
    db.commit()
    db.refresh(target)
    return target


@router.get("/projects", response_model=list[AdminProjectOut])
def list_projects(db: Session = Depends(get_db), _: User = Depends(require_roles("admin"))):
    rows = db.execute(
        select(Project, User)
        .join(User, User.id == Project.owner_id)
        .order_by(Project.created_at.desc())
    ).all()
    return [
        AdminProjectOut(
            id=project.id,
            owner_id=project.owner_id,
            name=project.name,
            description=project.description,
            status=project.status,
            budget_cap=project.budget_cap,
            location=project.location,
            created_at=project.created_at,
            updated_at=project.updated_at,
            owner_email=owner.email,
            owner_name=owner.full_name,
        )
        for project, owner in rows
    ]


@router.get("/rates", response_model=list[AdminRateOut])
def list_rates(db: Session = Depends(get_db), _: User = Depends(require_roles("admin"))):
    rows = db.execute(
        select(ReferenceRate, ReferenceItem)
        .join(ReferenceItem, ReferenceItem.id == ReferenceRate.reference_item_id)
        .order_by(ReferenceItem.category, ReferenceItem.item_name)
    ).all()
    return [
        AdminRateOut(
            id=rate.id,
            item_name=item.item_name,
            category=item.category,
            unit=item.unit,
            default_formula=item.default_formula,
            unit_rate=rate.unit_rate,
            currency=rate.currency,
            effective_date=rate.effective_date,
        )
        for rate, item in rows
    ]


@router.patch("/rates/{rate_id}", response_model=AdminRateOut)
def update_rate(
    rate_id: UUID,
    payload: RateUpdate,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles("admin")),
):
    rate = db.get(ReferenceRate, rate_id)
    if rate is None:
        raise HTTPException(status_code=404, detail="Rate not found")
    item = db.get(ReferenceItem, rate.reference_item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Reference item not found")
    before = {"unit_rate": str(rate.unit_rate), "currency": rate.currency}
    rate.unit_rate = payload.unit_rate
    rate.currency = payload.currency.upper()
    audit_logger.log_event(
        db,
        actor_type="human",
        action="reference_rate.update",
        entity_type="reference_rates",
        entity_id=rate.id,
        user_id=actor.id,
        before=before,
        after={"unit_rate": str(rate.unit_rate), "currency": rate.currency},
    )
    db.commit()
    db.refresh(rate)
    return AdminRateOut(
        id=rate.id,
        item_name=item.item_name,
        category=item.category,
        unit=item.unit,
        default_formula=item.default_formula,
        unit_rate=rate.unit_rate,
        currency=rate.currency,
        effective_date=rate.effective_date,
    )
