from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_roles
from app.db.session import get_db
from app.models.user import User
from app.models.vendor import Vendor, VendorCatalogItem, VendorDocument
from app.modules.audit.service import audit_logger
from app.modules.documents import storage
from app.modules.documents.tasks import enqueue_or_run_vendor
from app.modules.rag.embeddings import embedding_client
from app.models.rfq import Quotation, Rfq
from app.schemas import (
    CatalogItemCreate,
    CatalogItemPatch,
    DocumentOut,
    VendorCreate,
    VendorOut,
    VendorUpdate,
)

router = APIRouter(prefix="/api/vendors", tags=["vendors"])


@router.post("", response_model=VendorOut, status_code=201)
def create_vendor(
    payload: VendorCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("vendor", "admin")),
):
    existing = db.scalar(select(Vendor).where(Vendor.user_id == user.id))
    if existing:
        raise HTTPException(status_code=409, detail="Vendor profile already exists")
    vendor = Vendor(
        user_id=user.id,
        company_name=payload.company_name,
        category=payload.category,
        location=payload.location,
        description=payload.description,
        contact_email=payload.contact_email,
        phone=payload.phone,
        website=payload.website,
    )
    db.add(vendor)
    db.flush()
    audit_logger.log_event(
        db,
        actor_type="human",
        action="vendor.create",
        entity_type="vendors",
        entity_id=vendor.id,
        user_id=user.id,
        after={"company_name": vendor.company_name},
    )
    db.commit()
    db.refresh(vendor)
    return vendor


@router.get("/me", response_model=VendorOut)
def my_vendor(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    vendor = db.scalar(select(Vendor).where(Vendor.user_id == user.id))
    if vendor is None:
        raise HTTPException(status_code=404, detail="Vendor profile not found")
    return vendor


@router.get("/marketplace/catalog")
def marketplace_catalog(
    category: str | None = None,
    q: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = select(VendorCatalogItem).where(VendorCatalogItem.is_published.is_(True))
    if category:
        stmt = stmt.where(VendorCatalogItem.category.ilike(f"%{category}%"))
    items = list(db.scalars(stmt.order_by(VendorCatalogItem.created_at.desc())).all())
    if q:
        ql = q.lower()
        items = [i for i in items if ql in i.item_name.lower() or ql in (i.category or "").lower()]
    return [
        {
            "id": item.id,
            "vendor_id": item.vendor_id,
            "item_name": item.item_name,
            "category": item.category,
            "unit": item.unit,
            "unit_price": item.unit_price,
            "available_quantity": item.available_quantity,
            "confidence_score": item.confidence_score,
        }
        for item in items[:100]
    ]


@router.get("", response_model=list[VendorOut])
def list_vendors(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.scalars(select(Vendor).order_by(Vendor.created_at.desc())).all()


@router.get("/{vendor_id}", response_model=VendorOut)
def get_vendor(vendor_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    vendor = db.get(Vendor, vendor_id)
    if vendor is None:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return vendor


@router.post("/{vendor_id}/documents", response_model=DocumentOut, status_code=201)
def upload_vendor_document(
    vendor_id: UUID,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("vendor", "admin")),
):
    vendor = db.get(Vendor, vendor_id)
    if vendor is None:
        raise HTTPException(status_code=404, detail="Vendor not found")
    if user.role != "admin" and vendor.user_id != user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    data = file.file.read()
    suffix = f".{(file.filename or 'bin').split('.')[-1]}"
    try:
        key = storage.upload_bytes(data, content_type=file.content_type or "application/octet-stream", suffix=suffix)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=503, detail=f"Object storage unavailable: {exc}") from exc
    name = (file.filename or "").lower()
    if name.endswith(".pdf"):
        file_type = "pdf"
    elif name.endswith((".jpg", ".jpeg", ".png")):
        file_type = "image"
    elif name.endswith(".csv"):
        file_type = "csv"
    else:
        file_type = "excel"
    doc = VendorDocument(
        vendor_id=vendor.id,
        file_name=file.filename or "upload",
        file_type=file_type,
        storage_path=key,
        status="pending",
    )
    db.add(doc)
    db.flush()
    audit_logger.log_event(
        db,
        actor_type="human",
        action="vendor.document.upload",
        entity_type="vendor_documents",
        entity_id=doc.id,
        user_id=user.id,
        after={"file_name": doc.file_name},
    )
    db.commit()
    db.refresh(doc)
    enqueue_or_run_vendor(str(doc.id))
    db.expire_all()
    doc = db.get(VendorDocument, doc.id)
    assert doc is not None
    return DocumentOut(
        id=doc.id,
        project_id=None,
        file_name=doc.file_name,
        file_type=doc.file_type,
        status=doc.status,
        uploaded_at=doc.uploaded_at,
    )


@router.get("/{vendor_id}/catalog")
def get_catalog(vendor_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    vendor = db.get(Vendor, vendor_id)
    if vendor is None:
        raise HTTPException(status_code=404, detail="Vendor not found")
    items = db.scalars(select(VendorCatalogItem).where(VendorCatalogItem.vendor_id == vendor_id)).all()
    return [
        {
            "id": item.id,
            "item_name": item.item_name,
            "category": item.category,
            "unit": item.unit,
            "unit_price": item.unit_price,
            "available_quantity": item.available_quantity,
            "is_published": item.is_published,
            "is_verified": item.is_verified,
            "confidence_score": item.confidence_score,
        }
        for item in items
    ]


@router.patch("/catalog-items/{item_id}")
def patch_catalog_item(
    item_id: UUID,
    payload: CatalogItemPatch,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("vendor", "admin")),
):
    item = db.get(VendorCatalogItem, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Catalog item not found")
    vendor = db.get(Vendor, item.vendor_id)
    if vendor is None or (user.role != "admin" and vendor.user_id != user.id):
        raise HTTPException(status_code=403, detail="Forbidden")
    for field in ("item_name", "category", "unit", "unit_price", "available_quantity", "is_verified"):
        value = getattr(payload, field)
        if value is not None:
            setattr(item, field, value)
    item.embedding = embedding_client.embed([f"{item.item_name} {item.category or ''}"])[0]
    db.commit()
    return {"id": item.id, "item_name": item.item_name, "is_published": item.is_published}


@router.post("/catalog-items/{item_id}/publish")
def publish_catalog_item(
    item_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("vendor", "admin")),
):
    item = db.get(VendorCatalogItem, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Catalog item not found")
    vendor = db.get(Vendor, item.vendor_id)
    if vendor is None or (user.role != "admin" and vendor.user_id != user.id):
        raise HTTPException(status_code=403, detail="Forbidden")
    item.is_published = True
    item.is_verified = True
    item.embedding = embedding_client.embed([f"{item.item_name} {item.category or ''}"])[0]
    audit_logger.log_event(
        db,
        actor_type="human",
        action="catalog.publish",
        entity_type="vendor_catalog_items",
        entity_id=item.id,
        user_id=user.id,
        after={"item_name": item.item_name},
    )
    db.commit()
    return {"id": item.id, "is_published": True}


def _owned_item(db: Session, item_id: UUID, user: User) -> VendorCatalogItem:
    item = db.get(VendorCatalogItem, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Catalog item not found")
    vendor = db.get(Vendor, item.vendor_id)
    if vendor is None or (user.role != "admin" and vendor.user_id != user.id):
        raise HTTPException(status_code=403, detail="Forbidden")
    return item


@router.post("/catalog-items/{item_id}/unpublish")
def unpublish_catalog_item(
    item_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("vendor", "admin")),
):
    item = _owned_item(db, item_id, user)
    item.is_published = False
    audit_logger.log_event(
        db,
        actor_type="human",
        action="catalog.unpublish",
        entity_type="vendor_catalog_items",
        entity_id=item.id,
        user_id=user.id,
        after={"item_name": item.item_name},
    )
    db.commit()
    return {"id": item.id, "is_published": False}


@router.delete("/catalog-items/{item_id}", status_code=204)
def delete_catalog_item(
    item_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("vendor", "admin")),
):
    item = _owned_item(db, item_id, user)
    audit_logger.log_event(
        db,
        actor_type="human",
        action="catalog.delete",
        entity_type="vendor_catalog_items",
        entity_id=item.id,
        user_id=user.id,
        before={"item_name": item.item_name},
    )
    db.delete(item)
    db.commit()


@router.patch("/{vendor_id}", response_model=VendorOut)
def update_vendor(
    vendor_id: UUID,
    payload: VendorUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("vendor", "admin")),
):
    vendor = db.get(Vendor, vendor_id)
    if vendor is None:
        raise HTTPException(status_code=404, detail="Vendor not found")
    if user.role != "admin" and vendor.user_id != user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    for field, value in payload.model_dump(exclude_unset=True).items():
        if field == "company_name" and not value:
            continue
        setattr(vendor, field, value)
    audit_logger.log_event(
        db,
        actor_type="human",
        action="vendor.update",
        entity_type="vendors",
        entity_id=vendor.id,
        user_id=user.id,
        after=payload.model_dump(exclude_unset=True),
    )
    db.commit()
    db.refresh(vendor)
    return vendor


@router.post("/{vendor_id}/catalog-items", status_code=201)
def create_catalog_item(
    vendor_id: UUID,
    payload: CatalogItemCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("vendor", "admin")),
):
    vendor = db.get(Vendor, vendor_id)
    if vendor is None:
        raise HTTPException(status_code=404, detail="Vendor not found")
    if user.role != "admin" and vendor.user_id != user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    item = VendorCatalogItem(
        vendor_id=vendor.id,
        item_name=payload.item_name,
        category=payload.category or vendor.category,
        unit=payload.unit,
        unit_price=payload.unit_price,
        available_quantity=payload.available_quantity,
        specifications=payload.specifications,
        confidence_score=1,
        is_verified=True,
        is_published=payload.publish,
        embedding=embedding_client.embed([f"{payload.item_name} {payload.category or vendor.category or ''}"])[0],
    )
    db.add(item)
    db.flush()
    audit_logger.log_event(
        db,
        actor_type="human",
        action="catalog.create",
        entity_type="vendor_catalog_items",
        entity_id=item.id,
        user_id=user.id,
        after={"item_name": item.item_name, "published": item.is_published},
    )
    db.commit()
    return {"id": item.id, "item_name": item.item_name, "is_published": item.is_published}


@router.get("/{vendor_id}/documents")
def list_vendor_documents(
    vendor_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("vendor", "admin")),
):
    vendor = db.get(Vendor, vendor_id)
    if vendor is None:
        raise HTTPException(status_code=404, detail="Vendor not found")
    if user.role != "admin" and vendor.user_id != user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    docs = db.scalars(
        select(VendorDocument).where(VendorDocument.vendor_id == vendor_id).order_by(VendorDocument.uploaded_at.desc())
    ).all()
    return [
        {"id": d.id, "file_name": d.file_name, "file_type": d.file_type, "status": d.status, "uploaded_at": d.uploaded_at}
        for d in docs
    ]


@router.get("/{vendor_id}/quotations")
def vendor_quotations(
    vendor_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("vendor", "admin")),
):
    vendor = db.get(Vendor, vendor_id)
    if vendor is None:
        raise HTTPException(status_code=404, detail="Vendor not found")
    if user.role != "admin" and vendor.user_id != user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    quotes = db.scalars(
        select(Quotation).where(Quotation.vendor_id == vendor_id).order_by(Quotation.submitted_at.desc())
    ).all()
    out = []
    for q in quotes:
        rfq = db.get(Rfq, q.rfq_id)
        out.append(
            {
                "id": q.id,
                "rfq_id": q.rfq_id,
                "status": q.status,
                "total_price": q.total_price,
                "currency": q.currency,
                "submitted_at": q.submitted_at,
                "rfq_status": rfq.status if rfq else None,
            }
        )
    return out
