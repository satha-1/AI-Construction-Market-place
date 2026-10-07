"""Hybrid retriever: structured filter + keyword / vector ranking."""

from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.document import DocumentChunk, ProjectDocument
from app.models.vendor import VendorCatalogItem
from app.modules.rag.embeddings import embedding_client


@dataclass
class RetrievedChunk:
    chunk_id: UUID
    document_id: UUID
    content: str
    score: float
    citation: dict


class HybridRetriever:
    def search(self, db: Session, *, project_id: UUID, query: str, k: int = 8) -> list[RetrievedChunk]:
        docs = db.scalars(select(ProjectDocument).where(ProjectDocument.project_id == project_id)).all()
        doc_ids = [d.id for d in docs]
        if not doc_ids:
            return []
        chunks = db.scalars(select(DocumentChunk).where(DocumentChunk.document_id.in_(doc_ids))).all()
        if not chunks:
            return []

        query_terms = {t.lower() for t in query.split() if len(t) > 2}
        query_vec = embedding_client.embed([query])[0]

        scored: list[RetrievedChunk] = []
        for chunk in chunks:
            content_l = chunk.content.lower()
            keyword = sum(1 for t in query_terms if t in content_l) / max(len(query_terms), 1)
            vector = 0.0
            if chunk.embedding is not None:
                emb = list(chunk.embedding)
                vector = _cosine(query_vec, emb)
            score = 0.55 * keyword + 0.45 * max(vector, 0.0)
            if score <= 0 and query_terms:
                continue
            scored.append(
                RetrievedChunk(
                    chunk_id=chunk.id,
                    document_id=chunk.document_id,
                    content=chunk.content,
                    score=score,
                    citation={
                        "document_id": str(chunk.document_id),
                        "chunk_id": str(chunk.id),
                        "page": (chunk.chunk_metadata or {}).get("page"),
                        "sheet": (chunk.chunk_metadata or {}).get("sheet"),
                    },
                )
            )
        scored.sort(key=lambda c: c.score, reverse=True)
        if not scored:
            # Fall back to first k chunks so empty-query / weak-match still returns context.
            for chunk in chunks[:k]:
                scored.append(
                    RetrievedChunk(
                        chunk_id=chunk.id,
                        document_id=chunk.document_id,
                        content=chunk.content,
                        score=0.0,
                        citation={"document_id": str(chunk.document_id), "chunk_id": str(chunk.id)},
                    )
                )
        return scored[:k]

    def search_catalog(
        self,
        db: Session,
        *,
        query: str,
        category: str | None = None,
        k: int = 10,
    ) -> list[VendorCatalogItem]:
        stmt = select(VendorCatalogItem).where(VendorCatalogItem.is_published.is_(True))
        if category:
            stmt = stmt.where(VendorCatalogItem.category.ilike(f"%{category}%"))
        items = list(db.scalars(stmt).all())
        if not items:
            return []
        query_vec = embedding_client.embed([query])[0]
        terms = {t.lower() for t in query.split() if len(t) > 2}

        def score(item: VendorCatalogItem) -> float:
            text = f"{item.item_name} {item.category or ''} {item.specifications or ''}".lower()
            keyword = sum(1 for t in terms if t in text) / max(len(terms), 1)
            vector = _cosine(query_vec, list(item.embedding)) if item.embedding is not None else 0.0
            return 0.5 * keyword + 0.5 * max(vector, 0.0)

        items.sort(key=score, reverse=True)
        return items[:k]


def _cosine(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    na = sum(x * x for x in a) ** 0.5
    nb = sum(y * y for y in b) ** 0.5
    if na == 0 or nb == 0:
        return 0.0
    return dot / (na * nb)


hybrid_retriever = HybridRetriever()
