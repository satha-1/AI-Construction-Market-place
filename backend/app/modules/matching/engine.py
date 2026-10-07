"""Vendor matching: structured filter + semantic rank."""

from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.boq import Boq, BoqItem
from app.models.vendor import Vendor, VendorCatalogItem
from app.modules.rag.embeddings import embedding_client
from app.modules.rag.retriever import _cosine


def match_vendors_for_project(
    db: Session,
    project_id: UUID,
    *,
    category: str | None = None,
    budget: float | None = None,
    location: str | None = None,
    limit: int = 10,
) -> list[dict]:
    boq = db.scalar(select(Boq).where(Boq.project_id == project_id).order_by(Boq.version.desc()))
    items = list(boq.items) if boq else []
    if not items:
        # Browse marketplace with category filter only
        return _rank_catalog(db, query=category or "construction", category=category, budget=budget, location=location, limit=limit)

    matches: list[dict] = []
    for item in items:
        query = f"{item.item_name} {item.category or ''}"
        ranked = _rank_catalog(
            db,
            query=query,
            category=category or item.category,
            budget=budget,
            location=location,
            unit=item.unit,
            quantity=float(item.quantity) if item.quantity is not None else None,
            limit=5,
        )
        for m in ranked:
            m["boq_item_id"] = str(item.id)
            m["boq_item_name"] = item.item_name
            matches.append(m)
    matches.sort(key=lambda m: m["match_score"], reverse=True)
    return matches[:limit]


def _rank_catalog(
    db: Session,
    *,
    query: str,
    category: str | None,
    budget: float | None,
    location: str | None,
    unit: str | None = None,
    quantity: float | None = None,
    limit: int = 10,
) -> list[dict]:
    stmt = select(VendorCatalogItem).where(VendorCatalogItem.is_published.is_(True))
    if category:
        stmt = stmt.where(VendorCatalogItem.category.ilike(f"%{category}%"))
    if unit:
        stmt = stmt.where(VendorCatalogItem.unit.ilike(unit))
    candidates = list(db.scalars(stmt).all())

    # Soft structured filters
    filtered = []
    for item in candidates:
        if budget is not None and item.unit_price is not None and float(item.unit_price) > budget:
            continue
        if quantity is not None and item.available_quantity is not None and float(item.available_quantity) < quantity:
            continue
        vendor = db.get(Vendor, item.vendor_id)
        if location and vendor and vendor.location and location.lower() not in vendor.location.lower():
            continue
        filtered.append((item, vendor))

    if not filtered and candidates:
        # Ensure at least structured category candidates are ranked.
        filtered = [(i, db.get(Vendor, i.vendor_id)) for i in candidates]

    if not filtered:
        return []

    qvec = embedding_client.embed([query])[0]
    terms = {t.lower() for t in query.split() if len(t) > 2}
    ranked = []
    for item, vendor in filtered:
        text = f"{item.item_name} {item.category or ''}"
        keyword = sum(1 for t in terms if t in text.lower()) / max(len(terms), 1)
        semantic = _cosine(qvec, list(item.embedding)) if item.embedding is not None else 0.0
        structured = 0.5
        if category and item.category and category.lower() in item.category.lower():
            structured += 0.3
        if unit and item.unit and unit.lower() == item.unit.lower():
            structured += 0.2
        score = 0.35 * structured + 0.25 * keyword + 0.40 * max(semantic, 0.0)
        ranked.append(
            {
                "catalog_item_id": str(item.id),
                "vendor_id": str(item.vendor_id),
                "company_name": vendor.company_name if vendor else None,
                "item_name": item.item_name,
                "category": item.category,
                "unit_price": str(item.unit_price) if item.unit_price is not None else None,
                "unit": item.unit,
                "match_score": round(score, 4),
                "rationale": (
                    f"Structured fit + semantic similarity for '{item.item_name}'. "
                    f"keyword={keyword:.2f}, semantic={semantic:.2f}"
                ),
            }
        )
    ranked.sort(key=lambda m: m["match_score"], reverse=True)
    return ranked[:limit]
