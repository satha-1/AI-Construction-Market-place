from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_roles
from app.db.session import get_db
from app.models.boq import Boq, BoqItem
from app.models.project import Project
from app.models.rfq import Quotation, QuotationLineItem, Rfq, RfqLineItem, rfq_vendors
from app.models.user import User
from app.models.vendor import Vendor
from app.modules.agent.tools import CompareQuotationsTool
from app.modules.audit.service import audit_logger
from app.schemas import QuotationCreate, RfqCreate

router = APIRouter(tags=["rfq"])


@router.post("/api/projects/{project_id}/rfqs", status_code=201)
def create_rfq(
    project_id: UUID,
    payload: RfqCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("customer", "admin")),
):
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    if user.role != "admin" and project.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    boq = db.get(Boq, payload.boq_id) if payload.boq_id else db.scalar(
        select(Boq).where(Boq.project_id == project_id).order_by(Boq.version.desc())
    )
    if boq is None or boq.project_id != project_id:
        raise HTTPException(status_code=400, detail="BOQ required")
    rfq = Rfq(project_id=project_id, boq_id=boq.id, status="open", deadline=payload.deadline)
    db.add(rfq)
    db.flush()
    item_ids = payload.boq_item_ids or [i.id for i in boq.items]
    for item_id in item_ids:
        item = db.get(BoqItem, item_id)
        if item is None or item.boq_id != boq.id:
            continue
        db.add(
            RfqLineItem(
                rfq_id=rfq.id,
                boq_item_id=item.id,
                requested_quantity=item.quantity or Decimal("1"),
            )
        )
    for vendor_id in payload.vendor_ids:
        vendor = db.get(Vendor, vendor_id)
        if vendor is None:
            continue
        db.execute(rfq_vendors.insert().values(rfq_id=rfq.id, vendor_id=vendor.id))
    project.status = "sourcing"
    audit_logger.log_event(
        db,
        actor_type="human",
        action="rfq.create",
        entity_type="rfqs",
        entity_id=rfq.id,
        user_id=user.id,
        project_id=project_id,
        after={"vendor_count": len(payload.vendor_ids), "boq_id": str(boq.id)},
    )
    db.commit()
    db.refresh(rfq)
    return {"id": rfq.id, "status": rfq.status, "boq_id": rfq.boq_id}


@router.get("/api/projects/{project_id}/rfqs")
def list_project_rfqs(project_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    if user.role != "admin" and project.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    rfqs = db.scalars(select(Rfq).where(Rfq.project_id == project_id).order_by(Rfq.created_at.desc())).all()
    return [{"id": r.id, "status": r.status, "boq_id": r.boq_id, "created_at": r.created_at, "deadline": r.deadline} for r in rfqs]


@router.get("/api/vendors/{vendor_id}/rfqs")
def vendor_rfq_inbox(vendor_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    vendor = db.get(Vendor, vendor_id)
    if vendor is None:
        raise HTTPException(status_code=404, detail="Vendor not found")
    if user.role != "admin" and vendor.user_id != user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    rows = db.execute(select(rfq_vendors.c.rfq_id).where(rfq_vendors.c.vendor_id == vendor_id)).all()
    rfq_ids = [r[0] for r in rows]
    if not rfq_ids:
        return []
    rfqs = db.scalars(select(Rfq).where(Rfq.id.in_(rfq_ids)).order_by(Rfq.created_at.desc())).all()
    return [
        {
            "id": r.id,
            "project_id": r.project_id,
            "status": r.status,
            "boq_id": r.boq_id,
            "created_at": r.created_at,
            "deadline": r.deadline,
            "line_items": [
                {"id": li.id, "boq_item_id": li.boq_item_id, "requested_quantity": li.requested_quantity}
                for li in r.line_items
            ],
        }
        for r in rfqs
    ]


@router.post("/api/rfqs/{rfq_id}/quotations", status_code=201)
def submit_quotation(
    rfq_id: UUID,
    payload: QuotationCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("vendor", "admin")),
):
    rfq = db.get(Rfq, rfq_id)
    if rfq is None:
        raise HTTPException(status_code=404, detail="RFQ not found")
    vendor = db.scalar(select(Vendor).where(Vendor.user_id == user.id)) if user.role == "vendor" else db.get(Vendor, payload.vendor_id)
    if vendor is None:
        raise HTTPException(status_code=400, detail="Vendor profile required")
    invited = db.execute(
        select(rfq_vendors).where(rfq_vendors.c.rfq_id == rfq_id, rfq_vendors.c.vendor_id == vendor.id)
    ).first()
    if invited is None and user.role != "admin":
        raise HTTPException(status_code=403, detail="Vendor not invited to this RFQ")
    total = Decimal("0")
    quotation = Quotation(rfq_id=rfq.id, vendor_id=vendor.id, status="submitted", total_price=Decimal("0"), currency=payload.currency)
    db.add(quotation)
    db.flush()
    for line in payload.lines:
        line_total = (line.unit_price * line.quantity).quantize(Decimal("0.01"))
        total += line_total
        db.add(
            QuotationLineItem(
                quotation_id=quotation.id,
                rfq_line_item_id=line.rfq_line_item_id,
                catalog_item_id=line.catalog_item_id,
                unit_price=line.unit_price,
                quantity=line.quantity,
                line_total=line_total,
                lead_time=line.lead_time,
                notes=line.notes,
            )
        )
    quotation.total_price = total
    rfq.status = "responded"
    project = db.get(Project, rfq.project_id)
    if project:
        project.status = "quoted"
    audit_logger.log_event(
        db,
        actor_type="human",
        action="quotation.submit",
        entity_type="quotations",
        entity_id=quotation.id,
        user_id=user.id,
        project_id=rfq.project_id,
        after={"total_price": str(total)},
    )
    db.commit()
    db.refresh(quotation)
    return {"id": quotation.id, "total_price": quotation.total_price, "status": quotation.status}


@router.get("/api/rfqs/{rfq_id}/comparison")
def compare_rfq(rfq_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rfq = db.get(Rfq, rfq_id)
    if rfq is None:
        raise HTTPException(status_code=404, detail="RFQ not found")
    project = db.get(Project, rfq.project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    vendor = db.scalar(select(Vendor).where(Vendor.user_id == user.id))
    allowed = user.role == "admin" or project.owner_id == user.id or (
        vendor is not None
        and db.execute(select(rfq_vendors).where(rfq_vendors.c.rfq_id == rfq_id, rfq_vendors.c.vendor_id == vendor.id)).first()
    )
    if not allowed:
        raise HTTPException(status_code=403, detail="Forbidden")
    result = CompareQuotationsTool().execute(db, rfq.project_id, rfq_id=str(rfq_id))
    return result.data
