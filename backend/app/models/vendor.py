from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Numeric, String, Text, func
from sqlalchemy.dialects.postgresql import ARRAY, DOUBLE_PRECISION, JSONB, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Vendor(Base):
    __tablename__ = "vendors"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    user_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("users.id"), unique=True, nullable=False)
    company_name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str | None] = mapped_column(String(128))
    location: Mapped[str | None] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="vendor")
    documents = relationship("VendorDocument", back_populates="vendor")
    catalog_items = relationship("VendorCatalogItem", back_populates="vendor")


class VendorDocument(Base):
    __tablename__ = "vendor_documents"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    vendor_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("vendors.id"), nullable=False)
    file_name: Mapped[str] = mapped_column(String(512), nullable=False)
    file_type: Mapped[str] = mapped_column(String(32), nullable=False)
    storage_path: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        Enum("pending", "processing", "processed", "failed", name="document_status", create_constraint=False),
        nullable=False,
        server_default="pending",
    )
    uploaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    vendor = relationship("Vendor", back_populates="documents")


class VendorCatalogItem(Base):
    __tablename__ = "vendor_catalog_items"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    vendor_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("vendors.id"), nullable=False)
    source_document_id: Mapped[UUID | None] = mapped_column(PGUUID(as_uuid=True), ForeignKey("vendor_documents.id"))
    item_name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str | None] = mapped_column(String(128))
    specifications: Mapped[dict | None] = mapped_column(JSONB)
    unit: Mapped[str | None] = mapped_column(String(32))
    available_quantity: Mapped[Decimal | None] = mapped_column(Numeric(14, 4))
    unit_price: Mapped[Decimal | None] = mapped_column(Numeric(14, 4))
    confidence_score: Mapped[Decimal | None] = mapped_column(Numeric(5, 4))
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    is_published: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")
    embedding: Mapped[list[float] | None] = mapped_column(ARRAY(DOUBLE_PRECISION), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    vendor = relationship("Vendor", back_populates="catalog_items")
