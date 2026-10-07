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
from app.schemas import CatalogItemPatch, DocumentOut, VendorCreate, VendorOut

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
