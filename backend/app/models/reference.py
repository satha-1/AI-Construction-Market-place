from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlalchemy import Date, ForeignKey, Numeric, Text, func
from sqlalchemy.dialects.postgresql import UUID as PGUUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ReferenceItem(Base):
    __tablename__ = "reference_items"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    item_name: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(Text, nullable=False)
    unit: Mapped[str] = mapped_column(Text, nullable=False)
    default_formula: Mapped[str] = mapped_column(Text, nullable=False)


class ReferenceRate(Base):
    __tablename__ = "reference_rates"

    id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    reference_item_id: Mapped[UUID] = mapped_column(PGUUID(as_uuid=True), ForeignKey("reference_items.id"), nullable=False)
    unit_rate: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    currency: Mapped[str] = mapped_column(Text, nullable=False, default="USD")
    effective_date: Mapped[date] = mapped_column(Date, nullable=False, server_default=func.current_date())
