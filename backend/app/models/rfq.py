from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import Column, DateTime, Enum, ForeignKey, Numeric, String, Table, Text, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

rfq_vendors = Table(
    "rfq_vendors",
    Base.metadata,
    Column("rfq_id", PGUUID(as_uuid=True), ForeignKey("rfqs.id", ondelete="CASCADE"), primary_key=True),
    Column("vendor_id", PGUUID(as_uuid=True), ForeignKey("vendors.id"), primary_key=True),
)


class Rfq(Base):
    __tablename__ = "rfqs"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    project_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    boq_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("boqs.id"), nullable=False)
    status: Mapped[str] = mapped_column(
        Enum("open", "responded", "closed", name="rfq_status", create_constraint=False),
        nullable=False,
        server_default="open",
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    deadline: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    line_items = relationship("RfqLineItem", back_populates="rfq")


class RfqLineItem(Base):
    __tablename__ = "rfq_line_items"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    rfq_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("rfqs.id"), nullable=False)
    boq_item_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("boq_items.id"), nullable=False)
    requested_quantity: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)

    rfq = relationship("Rfq", back_populates="line_items")


class Quotation(Base):
    __tablename__ = "quotations"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    rfq_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("rfqs.id"), nullable=False)
    vendor_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("vendors.id"), nullable=False)
    status: Mapped[str] = mapped_column(
        Enum(
            "submitted",
            "withdrawn",
            "selected",
            "rejected",
            name="quotation_status",
            create_constraint=False,
        ),
        nullable=False,
        server_default="submitted",
    )
    total_price: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    currency: Mapped[str] = mapped_column(String(8), nullable=False, default="USD")
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class QuotationLineItem(Base):
    __tablename__ = "quotation_line_items"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    quotation_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("quotations.id"), nullable=False)
    rfq_line_item_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("rfq_line_items.id"), nullable=False)
    catalog_item_id: Mapped[UUID | None] = mapped_column(PGUUID(as_uuid=True), ForeignKey("vendor_catalog_items.id"))
    unit_price: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    line_total: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    lead_time: Mapped[str | None] = mapped_column(String(64))
    notes: Mapped[str | None] = mapped_column(Text)
