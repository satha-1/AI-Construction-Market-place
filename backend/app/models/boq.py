from datetime import datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Boq(Base):
    __tablename__ = "boqs"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    project_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("projects.id"), nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    status: Mapped[str] = mapped_column(
        Enum("draft", "reviewed", "final", name="boq_status", create_constraint=False),
        nullable=False,
        server_default="draft",
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    items = relationship("BoqItem", back_populates="boq")


class BoqItem(Base):
    __tablename__ = "boq_items"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    boq_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("boqs.id"), nullable=False)
    source_requirement_id: Mapped[UUID | None] = mapped_column(
        PGUUID(as_uuid=True), ForeignKey("extracted_requirements.id")
    )
    item_name: Mapped[str] = mapped_column(String(255), nullable=False)
    category: Mapped[str | None] = mapped_column(String(128))
    unit: Mapped[str | None] = mapped_column(String(32))
    quantity: Mapped[Decimal | None] = mapped_column(Numeric(14, 4))
    confidence_score: Mapped[Decimal | None] = mapped_column(Numeric(5, 4))
    calculation_trace: Mapped[dict | None] = mapped_column(JSONB)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, server_default="false")

    boq = relationship("Boq", back_populates="items")


class Estimate(Base):
    __tablename__ = "estimates"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    boq_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("boqs.id"), nullable=False)
    total_cost: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False, default=0)
    currency: Mapped[str] = mapped_column(String(8), nullable=False, default="USD")
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    line_items = relationship("EstimateLineItem", back_populates="estimate")


class EstimateLineItem(Base):
    __tablename__ = "estimate_line_items"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    estimate_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("estimates.id"), nullable=False)
    boq_item_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("boq_items.id"), nullable=False)
    unit_rate: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    quantity: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    line_total: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    rate_source: Mapped[str] = mapped_column(String(32), nullable=False, default="reference_rates")

    estimate = relationship("Estimate", back_populates="line_items")
