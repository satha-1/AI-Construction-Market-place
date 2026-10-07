"""Parse → chunk → embed pipeline for project and vendor documents."""

from __future__ import annotations

import re
from decimal import Decimal, InvalidOperation
from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.models.document import DocumentChunk, ProjectDocument
from app.models.vendor import VendorCatalogItem, VendorDocument
from app.modules.documents.chunker import Chunker
from app.modules.documents.parsers import ParserFactory
from app.modules.documents import storage
from app.modules.rag.embeddings import embedding_client


def process_project_document_sync(db: Session, document_id: UUID | str) -> None:
    doc = db.get(ProjectDocument, document_id)
    if doc is None:
        return
    doc.status = "processing"
    db.commit()
    try:
        data = storage.download_bytes(doc.storage_path)
        parser = ParserFactory().for_type(doc.file_type)
        parsed = parser.parse(data, file_name=doc.file_name)
        chunks = Chunker().chunk(parsed.blocks)

        db.execute(delete(DocumentChunk).where(DocumentChunk.document_id == doc.id))
        texts = [c.content for c in chunks]
        vectors = embedding_client.embed(texts) if texts else []
        for chunk, vector in zip(chunks, vectors or [None] * len(chunks)):
            db.add(
                DocumentChunk(
                    document_id=doc.id,
                    chunk_index=chunk.chunk_index,
                    content=chunk.content,
                    chunk_metadata=chunk.metadata,
                    embedding=vector,
                )
            )
        doc.status = "processed"
        doc.parse_metadata = {**parsed.metadata, "chunk_count": len(chunks)}
        db.commit()
    except Exception as exc:  # noqa: BLE001
        doc.status = "failed"
        doc.parse_metadata = {"error": str(exc)}
        db.commit()


def process_vendor_document_sync(db: Session, document_id: UUID | str) -> None:
    doc = db.get(VendorDocument, document_id)
    if doc is None:
        return
    doc.status = "processing"
    db.commit()
    try:
        data = storage.download_bytes(doc.storage_path)
        parser = ParserFactory().for_type(doc.file_type)
        parsed = parser.parse(data, file_name=doc.file_name)
        extracted = _extract_catalog_rows(parsed.blocks)
        for row in extracted:
            item = VendorCatalogItem(
                vendor_id=doc.vendor_id,
                source_document_id=doc.id,
                item_name=row["item_name"],
                category=row.get("category"),
                specifications=row.get("specifications"),
                unit=row.get("unit"),
                available_quantity=row.get("available_quantity"),
                unit_price=row.get("unit_price"),
                confidence_score=row.get("confidence_score", Decimal("0.70")),
                is_verified=False,
                is_published=False,
            )
            db.add(item)
            db.flush()
            emb = embedding_client.embed([f"{item.item_name} {item.category or ''}"])[0]
            item.embedding = emb
        doc.status = "processed"
        db.commit()
    except Exception:  # noqa: BLE001
        doc.status = "failed"
        db.commit()


def _extract_catalog_rows(blocks) -> list[dict]:
    """Heuristic catalog extraction from tabular text (Excel/CSV/PDF tables)."""
    rows: list[dict] = []
    price_re = re.compile(r"(\d+(?:\.\d+)?)")
    for block in blocks:
        for line in block.text.splitlines():
            parts = [p.strip() for p in re.split(r"[|,;\t]", line) if p.strip()]
            if len(parts) < 2:
                continue
            lower = line.lower()
            if any(h in lower for h in ("item", "description", "unit price", "qty")) and len(parts) <= 4:
                # Likely a header row
                if "item" in lower or "description" in lower:
                    continue
            item_name = parts[0]
            if len(item_name) < 2 or item_name.lower() in {"item", "name", "description"}:
                continue
            unit = None
            unit_price = None
            qty = None
            category = None
            for part in parts[1:]:
                pl = part.lower()
                if pl in {"m2", "m3", "m", "ea", "kg", "ton", "ls", "nos", "no"}:
                    unit = part
                    continue
                nums = price_re.findall(part.replace(",", ""))
                if nums and ("$" in part or "price" in pl or unit_price is None):
                    try:
                        val = Decimal(nums[0])
                        if unit_price is None and val > 0:
                            unit_price = val
                        elif qty is None:
                            qty = val
                    except InvalidOperation:
                        pass
                elif category is None and not nums:
                    category = part
            rows.append(
                {
                    "item_name": item_name[:255],
                    "category": category,
                    "unit": unit or "ea",
                    "unit_price": unit_price,
                    "available_quantity": qty,
                    "specifications": {"raw": line[:500]},
                    "confidence_score": Decimal("0.75") if unit_price is not None else Decimal("0.55"),
                }
            )
    # Deduplicate by name
    seen: set[str] = set()
    unique = []
    for row in rows:
        key = row["item_name"].lower()
        if key in seen:
            continue
        seen.add(key)
        unique.append(row)
    return unique[:200]
