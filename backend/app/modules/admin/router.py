from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.deps import require_roles
from app.db.session import get_db
from app.models.audit import AuditLog
from app.models.document import ProjectDocument
from app.models.project import Project
from app.models.reference import ReferenceItem, ReferenceRate
from app.models.rfq import Quotation, Rfq
from app.models.user import User
from app.models.vendor import Vendor, VendorCatalogItem
from app.models.verification import UncertaintyFlag
from app.modules.audit.service import audit_logger
from app.modules.notifications.service import notify
from app.schemas import (
    AdminOverview,
    AdminProjectOut,
    AdminRateOut,
    RateUpdate,
    RoleUpdate,
    UserOut,
    UserStatusUpdate,
    VendorStatusUpdate,
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
        rfqs=_count(db, Rfq),
        quotations=_count(db, Quotation),
        catalog_items=_count(db, VendorCatalogItem),
        published_items=_count(db, VendorCatalogItem, VendorCatalogItem.is_published.is_(True)),
        documents=_count(db, ProjectDocument),
    )


@router.patch("/users/{user_id}/status", response_model=UserOut)
def update_user_status(
    user_id: UUID,
    payload: UserStatusUpdate,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles("admin")),
):
    target = db.get(User, user_id)
    if target is None:
        raise HTTPException(status_code=404, detail="User not found")
    if target.id == actor.id and not payload.is_active:
        raise HTTPException(status_code=400, detail="You cannot deactivate your own account")
    before = target.is_active
    target.is_active = payload.is_active
    audit_logger.log_event(
        db,
        actor_type="human",
        action="user.activate" if payload.is_active else "user.deactivate",
        entity_type="users",
        entity_id=target.id,
        user_id=actor.id,
        before={"is_active": before},
        after={"is_active": target.is_active},
    )
    db.commit()
    db.refresh(target)
    return target


@router.get("/vendors")
def list_vendors(db: Session = Depends(get_db), _: User = Depends(require_roles("admin"))):
    rows = db.execute(select(Vendor, User).join(User, User.id == Vendor.user_id).order_by(Vendor.created_at.desc())).all()
    counts = dict(
        db.execute(select(VendorCatalogItem.vendor_id, func.count()).group_by(VendorCatalogItem.vendor_id)).all()
    )
    published = dict(
        db.execute(
            select(VendorCatalogItem.vendor_id, func.count())
            .where(VendorCatalogItem.is_published.is_(True))
            .group_by(VendorCatalogItem.vendor_id)
        ).all()
    )
    return [
        {
            "id": v.id,
            "company_name": v.company_name,
            "category": v.category,
            "location": v.location,
            "status": v.status,
            "contact_email": v.contact_email,
            "owner_email": u.email,
            "owner_name": u.full_name,
            "catalog_items": int(counts.get(v.id, 0)),
            "published_items": int(published.get(v.id, 0)),
            "created_at": v.created_at,
        }
        for v, u in rows
    ]


@router.patch("/vendors/{vendor_id}/status")
def update_vendor_status(
    vendor_id: UUID,
    payload: VendorStatusUpdate,
    db: Session = Depends(get_db),
    actor: User = Depends(require_roles("admin")),
):
    vendor = db.get(Vendor, vendor_id)
    if vendor is None:
        raise HTTPException(status_code=404, detail="Vendor not found")
    before = vendor.status
    vendor.status = payload.status
    audit_logger.log_event(
        db,
        actor_type="human",
        action="vendor.status_change",
        entity_type="vendors",
        entity_id=vendor.id,
        user_id=actor.id,
        before={"status": before},
        after={"status": vendor.status},
    )
    notify(
        db,
        user_id=vendor.user_id,
        kind="vendor",
        title=f"Vendor profile {payload.status}",
        body=f"An administrator set your vendor profile to {payload.status}.",
        link="/vendor/profile",
    )
    db.commit()
    return {"id": vendor.id, "status": vendor.status}


@router.get("/audit-log")
def global_audit_log(
    action: str | None = None,
    entity_type: str | None = None,
    actor_type: str | None = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    _: User = Depends(require_roles("admin")),
):
    stmt = select(AuditLog, User).outerjoin(User, User.id == AuditLog.user_id)
    if action:
        stmt = stmt.where(AuditLog.action.ilike(f"%{action}%"))
    if entity_type:
        stmt = stmt.where(AuditLog.entity_type == entity_type)
    if actor_type:
        stmt = stmt.where(AuditLog.actor_type == actor_type)
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    rows = db.execute(stmt.order_by(AuditLog.created_at.desc()).limit(min(limit, 500)).offset(max(offset, 0))).all()
    return {
        "total": int(total),
        "items": [
            {
                "id": a.id,
                "action": a.action,
                "actor_type": a.actor_type,
                "entity_type": a.entity_type,
                "entity_id": a.entity_id,
                "user_email": u.email if u else None,
                "project_id": a.project_id,
                "confidence_score": a.confidence_score,
                "source_reference": a.source_reference,
                "before_value": a.before_value,
                "after_value": a.after_value,
                "created_at": a.created_at,
            }
            for a, u in rows
        ],
    }


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
