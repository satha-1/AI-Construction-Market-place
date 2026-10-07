from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import Boolean, DateTime, ForeignKey, Numeric, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ExtractedRequirement(Base):
    __tablename__ = "extracted_requirements"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    project_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    source_document_id: Mapped[UUID | None] = mapped_column(PGUUID(as_uuid=True), ForeignKey("project_documents.id"))
    source_chunk_id: Mapped[UUID | None] = mapped_column(PGUUID(as_uuid=True), ForeignKey("document_chunks.id"))
    component_type: Mapped[str] = mapped_column(String(128), nullable=False)
    attributes: Mapped[dict | None] = mapped_column(JSONB)
    confidence_score: Mapped[Decimal | None] = mapped_column(Numeric(5, 4))
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
