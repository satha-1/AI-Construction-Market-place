"""Public marketplace browsing — only approved vendors and published items."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.vendor import Vendor, VendorCatalogItem

router = APIRouter(prefix="/api/marketplace", tags=["marketplace"])


def _item_out(item: VendorCatalogItem, vendor: Vendor) -> dict:
    return {
        "id": item.id,
        "item_name": item.item_name,
        "category": item.category,
        "unit": item.unit,
        "unit_price": item.unit_price,
        "available_quantity": item.available_quantity,
        "specifications": item.specifications,
        "vendor_id": vendor.id,
        "company_name": vendor.company_name,
        "vendor_location": vendor.location,
    }


@router.get("/catalog")
def catalog(
    q: str | None = None,
    category: str | None = None,
    location: str | None = None,
    vendor_id: UUID | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    sort: str = "newest",
    limit: int = 24,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    stmt = (
        select(VendorCatalogItem, Vendor)
        .join(Vendor, Vendor.id == VendorCatalogItem.vendor_id)
        .where(VendorCatalogItem.is_published.is_(True), Vendor.status == "approved")
    )
    if q:
        like = f"%{q}%"
        stmt = stmt.where(or_(VendorCatalogItem.item_name.ilike(like), VendorCatalogItem.category.ilike(like), Vendor.company_name.ilike(like)))
    if category:
        stmt = stmt.where(VendorCatalogItem.category.ilike(category))
    if location:
        stmt = stmt.where(Vendor.location.ilike(f"%{location}%"))
    if vendor_id:
        stmt = stmt.where(VendorCatalogItem.vendor_id == vendor_id)
    if min_price is not None:
        stmt = stmt.where(VendorCatalogItem.unit_price >= min_price)
    if max_price is not None:
        stmt = stmt.where(VendorCatalogItem.unit_price <= max_price)

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    order = {
        "price_asc": VendorCatalogItem.unit_price.asc().nulls_last(),
        "price_desc": VendorCatalogItem.unit_price.desc().nulls_last(),
        "name": VendorCatalogItem.item_name.asc(),
    }.get(sort, VendorCatalogItem.created_at.desc())
    rows = db.execute(stmt.order_by(order).limit(min(limit, 100)).offset(max(offset, 0))).all()
    return {"total": int(total), "items": [_item_out(i, v) for i, v in rows]}


@router.get("/categories")
def categories(db: Session = Depends(get_db)):
    rows = db.execute(
        select(VendorCatalogItem.category, func.count())
        .join(Vendor, Vendor.id == VendorCatalogItem.vendor_id)
        .where(
            VendorCatalogItem.is_published.is_(True),
            Vendor.status == "approved",
            VendorCatalogItem.category.is_not(None),
        )
        .group_by(VendorCatalogItem.category)
        .order_by(func.count().desc())
    ).all()
    return [{"category": c, "count": int(n)} for c, n in rows]


@router.get("/locations")
def locations(db: Session = Depends(get_db)):
    rows = db.scalars(
        select(Vendor.location).where(Vendor.status == "approved", Vendor.location.is_not(None)).distinct().order_by(Vendor.location)
    ).all()
    return [r for r in rows if r]


@router.get("/vendors")
def vendors(
    q: str | None = None,
    category: str | None = None,
    location: str | None = None,
    db: Session = Depends(get_db),
):
    count_sub = (
        select(VendorCatalogItem.vendor_id, func.count().label("n"))
        .where(VendorCatalogItem.is_published.is_(True))
        .group_by(VendorCatalogItem.vendor_id)
        .subquery()
    )
    stmt = (
        select(Vendor, func.coalesce(count_sub.c.n, 0))
        .outerjoin(count_sub, count_sub.c.vendor_id == Vendor.id)
        .where(Vendor.status == "approved")
    )
    if q:
        like = f"%{q}%"
        stmt = stmt.where(or_(Vendor.company_name.ilike(like), Vendor.description.ilike(like)))
    if category:
        stmt = stmt.where(Vendor.category.ilike(category))
    if location:
        stmt = stmt.where(Vendor.location.ilike(f"%{location}%"))
    rows = db.execute(stmt.order_by(Vendor.company_name)).all()
    return [
        {
            "id": v.id,
            "company_name": v.company_name,
            "category": v.category,
            "location": v.location,
            "description": v.description,
            "published_items": int(n),
        }
        for v, n in rows
    ]


@router.get("/vendors/{vendor_id}")
def vendor_detail(vendor_id: UUID, db: Session = Depends(get_db)):
    vendor = db.get(Vendor, vendor_id)
    if vendor is None or vendor.status != "approved":
        raise HTTPException(status_code=404, detail="Vendor not found")
    items = db.scalars(
        select(VendorCatalogItem)
        .where(VendorCatalogItem.vendor_id == vendor_id, VendorCatalogItem.is_published.is_(True))
        .order_by(VendorCatalogItem.item_name)
    ).all()
    return {
        "id": vendor.id,
        "company_name": vendor.company_name,
        "category": vendor.category,
        "location": vendor.location,
        "description": vendor.description,
        "contact_email": vendor.contact_email,
        "phone": vendor.phone,
        "website": vendor.website,
        "items": [_item_out(i, vendor) for i in items],
    }
