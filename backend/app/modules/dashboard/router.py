from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.deps import require_roles
from app.db.session import get_db
from app.models.audit import AuditLog
from app.models.document import ProjectDocument
from app.models.project import Project
from app.models.rfq import Quotation, Rfq, rfq_vendors
from app.models.user import User
from app.models.vendor import Vendor, VendorCatalogItem
from app.models.verification import UncertaintyFlag

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


def _count(db: Session, model, *filters) -> int:
    stmt = select(func.count()).select_from(model)
    for clause in filters:
        stmt = stmt.where(clause)
    return int(db.scalar(stmt) or 0)


@router.get("/customer")
def customer_dashboard(db: Session = Depends(get_db), user: User = Depends(require_roles("customer", "admin"))):
    projects = db.scalars(select(Project).where(Project.owner_id == user.id).order_by(Project.updated_at.desc())).all()
    ids = [p.id for p in projects]
    by_status: dict[str, int] = {}
    for p in projects:
        by_status[p.status] = by_status.get(p.status, 0) + 1
    open_flags = _count(db, UncertaintyFlag, UncertaintyFlag.project_id.in_(ids), UncertaintyFlag.status == "open") if ids else 0
    rfq_rows = db.scalars(select(Rfq).where(Rfq.project_id.in_(ids))).all() if ids else []
    rfq_ids = [r.id for r in rfq_rows]
    quotations = _count(db, Quotation, Quotation.rfq_id.in_(rfq_ids)) if rfq_ids else 0
    documents = _count(db, ProjectDocument, ProjectDocument.project_id.in_(ids)) if ids else 0
    activity = (
        db.scalars(
            select(AuditLog).where(AuditLog.project_id.in_(ids)).order_by(AuditLog.created_at.desc()).limit(8)
        ).all()
        if ids
        else []
    )
    return {
        "totals": {
            "projects": len(projects),
            "documents": documents,
            "open_flags": open_flags,
            "rfqs": len(rfq_rows),
            "open_rfqs": sum(1 for r in rfq_rows if r.status != "closed"),
            "quotations": quotations,
        },
        "projects_by_status": by_status,
        "recent_projects": [
            {
                "id": p.id,
                "name": p.name,
                "status": p.status,
                "location": p.location,
                "budget_cap": p.budget_cap,
                "updated_at": p.updated_at,
            }
            for p in projects[:5]
        ],
        "activity": [
            {
                "id": a.id,
                "action": a.action,
                "actor_type": a.actor_type,
                "entity_type": a.entity_type,
                "created_at": a.created_at,
            }
            for a in activity
        ],
    }


@router.get("/vendor")
def vendor_dashboard(db: Session = Depends(get_db), user: User = Depends(require_roles("vendor", "admin"))):
    vendor = db.scalar(select(Vendor).where(Vendor.user_id == user.id))
    if vendor is None:
        return {"vendor": None}
    items = db.scalars(select(VendorCatalogItem).where(VendorCatalogItem.vendor_id == vendor.id)).all()
    rfq_ids = [r[0] for r in db.execute(select(rfq_vendors.c.rfq_id).where(rfq_vendors.c.vendor_id == vendor.id)).all()]
    rfqs = db.scalars(select(Rfq).where(Rfq.id.in_(rfq_ids)).order_by(Rfq.created_at.desc())).all() if rfq_ids else []
    quotes = db.scalars(select(Quotation).where(Quotation.vendor_id == vendor.id)).all()
    quoted_rfqs = {q.rfq_id for q in quotes}
    by_status: dict[str, int] = {}
    for q in quotes:
        by_status[q.status] = by_status.get(q.status, 0) + 1
    return {
        "vendor": {"id": vendor.id, "company_name": vendor.company_name, "status": vendor.status},
        "totals": {
            "catalog_items": len(items),
            "published": sum(1 for i in items if i.is_published),
            "drafts": sum(1 for i in items if not i.is_published),
            "rfqs": len(rfqs),
            "awaiting_quote": sum(1 for r in rfqs if r.id not in quoted_rfqs and r.status != "closed"),
            "quotations": len(quotes),
            "won": by_status.get("selected", 0),
        },
        "quotations_by_status": by_status,
        "recent_rfqs": [
            {
                "id": r.id,
                "status": r.status,
                "created_at": r.created_at,
                "deadline": r.deadline,
                "has_quoted": r.id in quoted_rfqs,
            }
            for r in rfqs[:5]
        ],
    }
