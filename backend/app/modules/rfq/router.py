from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
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
from app.modules.notifications.service import notify
from app.schemas import QuotationCreate, RfqCreate

router = APIRouter(tags=["rfq"])


def _invited(db: Session, rfq_id: UUID, vendor_id: UUID) -> bool:
    return (
        db.execute(
            select(rfq_vendors).where(rfq_vendors.c.rfq_id == rfq_id, rfq_vendors.c.vendor_id == vendor_id)
        ).first()
        is not None
    )


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
        raise HTTPException(status_code=400, detail="Generate a BOQ before creating an RFQ")
    if not payload.vendor_ids:
        raise HTTPException(status_code=400, detail="Select at least one vendor")
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
    invited = 0
    for vendor_id in payload.vendor_ids:
        vendor = db.get(Vendor, vendor_id)
        if vendor is None or vendor.status != "approved":
            continue
        db.execute(rfq_vendors.insert().values(rfq_id=rfq.id, vendor_id=vendor.id))
        invited += 1
        notify(
            db,
            user_id=vendor.user_id,
            kind="rfq",
            title="New request for quotation",
            body=f"{project.name} is requesting quotes for {len(item_ids)} items.",
            link=f"/vendor/rfqs/{rfq.id}",
        )
    if invited == 0:
        raise HTTPException(status_code=400, detail="None of the selected vendors are approved")
    project.status = "sourcing"
    audit_logger.log_event(
        db,
        actor_type="human",
        action="rfq.create",
        entity_type="rfqs",
        entity_id=rfq.id,
        user_id=user.id,
        project_id=project_id,
        after={"vendor_count": invited, "boq_id": str(boq.id)},
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
    out = []
    for r in rfqs:
        vendors = db.scalar(select(func.count()).select_from(rfq_vendors).where(rfq_vendors.c.rfq_id == r.id)) or 0
        quotes = db.scalar(select(func.count()).select_from(Quotation).where(Quotation.rfq_id == r.id)) or 0
        out.append(
            {
                "id": r.id,
                "status": r.status,
                "boq_id": r.boq_id,
                "created_at": r.created_at,
                "deadline": r.deadline,
                "line_count": len(r.line_items),
                "vendor_count": int(vendors),
                "quotation_count": int(quotes),
            }
        )
    return out


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
    quoted = {
        q.rfq_id: q
        for q in db.scalars(select(Quotation).where(Quotation.vendor_id == vendor_id, Quotation.rfq_id.in_(rfq_ids))).all()
    }
    out = []
    for r in rfqs:
        project = db.get(Project, r.project_id)
        quote = quoted.get(r.id)
        out.append(
            {
                "id": r.id,
                "project_id": r.project_id,
                "project_name": project.name if project else None,
                "project_location": project.location if project else None,
                "status": r.status,
                "boq_id": r.boq_id,
                "created_at": r.created_at,
                "deadline": r.deadline,
                "line_count": len(r.line_items),
                "has_quoted": quote is not None,
                "quotation_status": quote.status if quote else None,
            }
        )
    return out


def _line_payload(db: Session, li: RfqLineItem) -> dict:
    item = db.get(BoqItem, li.boq_item_id)
    return {
        "id": li.id,
        "boq_item_id": li.boq_item_id,
        "item_name": item.item_name if item else None,
        "category": item.category if item else None,
        "unit": item.unit if item else None,
        "requested_quantity": li.requested_quantity,
    }


def _quotation_payload(db: Session, q: Quotation) -> dict:
    vendor = db.get(Vendor, q.vendor_id)
    lines = db.scalars(select(QuotationLineItem).where(QuotationLineItem.quotation_id == q.id)).all()
    return {
        "id": q.id,
        "vendor_id": q.vendor_id,
        "company_name": vendor.company_name if vendor else None,
        "status": q.status,
        "total_price": q.total_price,
        "currency": q.currency,
        "submitted_at": q.submitted_at,
        "lines": [
            {
                "id": line.id,
                "rfq_line_item_id": line.rfq_line_item_id,
                "unit_price": line.unit_price,
                "quantity": line.quantity,
                "line_total": line.line_total,
                "lead_time": line.lead_time,
                "notes": line.notes,
            }
            for line in lines
        ],
    }


@router.get("/api/rfqs/{rfq_id}")
def rfq_detail(rfq_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rfq = db.get(Rfq, rfq_id)
    if rfq is None:
        raise HTTPException(status_code=404, detail="RFQ not found")
    project = db.get(Project, rfq.project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    own_vendor = db.scalar(select(Vendor).where(Vendor.user_id == user.id))
    is_owner = user.role == "admin" or project.owner_id == user.id
    is_invited_vendor = own_vendor is not None and _invited(db, rfq_id, own_vendor.id)
    if not (is_owner or is_invited_vendor):
        raise HTTPException(status_code=403, detail="Forbidden")

    quotes = db.scalars(select(Quotation).where(Quotation.rfq_id == rfq_id).order_by(Quotation.total_price)).all()
    if not is_owner:
        quotes = [q for q in quotes if own_vendor and q.vendor_id == own_vendor.id]
    vendor_rows = db.execute(
        select(Vendor).join(rfq_vendors, rfq_vendors.c.vendor_id == Vendor.id).where(rfq_vendors.c.rfq_id == rfq_id)
    ).scalars().all()
    payload = [_quotation_payload(db, q) for q in quotes]
    lowest = min((Decimal(str(p["total_price"])) for p in payload), default=None)
    return {
        "id": rfq.id,
        "status": rfq.status,
        "created_at": rfq.created_at,
        "deadline": rfq.deadline,
        "project": {"id": project.id, "name": project.name, "location": project.location},
        "lines": [_line_payload(db, li) for li in rfq.line_items],
        "vendors": [{"id": v.id, "company_name": v.company_name} for v in vendor_rows] if is_owner else [],
        "quotations": payload,
        "lowest_total": lowest,
        "viewer": "customer" if is_owner else "vendor",
    }


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
    if rfq.status == "closed":
        raise HTTPException(status_code=400, detail="This RFQ is closed")
    vendor = db.scalar(select(Vendor).where(Vendor.user_id == user.id)) if user.role == "vendor" else db.get(Vendor, payload.vendor_id)
    if vendor is None:
        raise HTTPException(status_code=400, detail="Vendor profile required")
    if not _invited(db, rfq_id, vendor.id) and user.role != "admin":
        raise HTTPException(status_code=403, detail="Vendor not invited to this RFQ")
    if not payload.lines:
        raise HTTPException(status_code=400, detail="Add at least one line")
    valid_lines = {li.id for li in rfq.line_items}
    if any(line.rfq_line_item_id not in valid_lines for line in payload.lines):
        raise HTTPException(status_code=400, detail="Line does not belong to this RFQ")
    # A vendor has one active quotation per RFQ — a re-submit replaces the previous one.
    previous = db.scalars(
        select(Quotation).where(Quotation.rfq_id == rfq_id, Quotation.vendor_id == vendor.id)
    ).all()
    for old in previous:
        if old.status == "selected":
            raise HTTPException(status_code=400, detail="Your quotation was already selected")
        db.query(QuotationLineItem).filter(QuotationLineItem.quotation_id == old.id).delete()
        db.delete(old)
    db.flush()

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
        notify(
            db,
            user_id=project.owner_id,
            kind="quotation",
            title="New quotation received",
            body=f"{vendor.company_name} quoted {total} {payload.currency} for {project.name}.",
            link=f"/projects/{project.id}/rfqs/{rfq.id}",
        )
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


@router.post("/api/quotations/{quotation_id}/select")
def select_quotation(
    quotation_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("customer", "admin")),
):
    quotation = db.get(Quotation, quotation_id)
    if quotation is None:
        raise HTTPException(status_code=404, detail="Quotation not found")
    rfq = db.get(Rfq, quotation.rfq_id)
    project = db.get(Project, rfq.project_id) if rfq else None
    if rfq is None or project is None:
        raise HTTPException(status_code=404, detail="RFQ not found")
    if user.role != "admin" and project.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    if rfq.status == "closed":
        raise HTTPException(status_code=400, detail="This RFQ is already closed")
    # Selection is always a human decision — never auto-selected by the agent.
    others = db.scalars(select(Quotation).where(Quotation.rfq_id == rfq.id)).all()
    for q in others:
        q.status = "selected" if q.id == quotation.id else "rejected"
        vendor = db.get(Vendor, q.vendor_id)
        if vendor:
            won = q.id == quotation.id
            notify(
                db,
                user_id=vendor.user_id,
                kind="quotation",
                title="Quotation selected" if won else "Quotation not selected",
                body=f"Your quotation for {project.name} was {'selected' if won else 'not selected'}.",
                link=f"/vendor/rfqs/{rfq.id}",
            )
    rfq.status = "closed"
    audit_logger.log_event(
        db,
        actor_type="human",
        action="quotation.select",
        entity_type="quotations",
        entity_id=quotation.id,
        user_id=user.id,
        project_id=project.id,
        after={"vendor_id": str(quotation.vendor_id), "total_price": str(quotation.total_price)},
    )
    db.commit()
    return {"id": quotation.id, "status": quotation.status, "rfq_status": rfq.status}


@router.get("/api/rfqs/{rfq_id}/comparison")
def compare_rfq(rfq_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rfq = db.get(Rfq, rfq_id)
    if rfq is None:
        raise HTTPException(status_code=404, detail="RFQ not found")
    project = db.get(Project, rfq.project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    if not (user.role == "admin" or project.owner_id == user.id):
        raise HTTPException(status_code=403, detail="Forbidden")
    result = CompareQuotationsTool().execute(db, rfq.project_id, rfq_id=str(rfq_id))
    return result.data
