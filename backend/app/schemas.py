from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str
    role: str = Field(pattern="^(customer|vendor)$")


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: UUID
    email: str
    full_name: str
    role: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ProjectCreate(BaseModel):
    name: str
    description: str | None = None
    budget_cap: Decimal | None = None
    location: str | None = None


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    status: str | None = None
    budget_cap: Decimal | None = None
    location: str | None = None


class ProjectOut(BaseModel):
    id: UUID
    owner_id: UUID
    name: str
    description: str | None
    status: str
    budget_cap: Decimal | None
    location: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class VendorCreate(BaseModel):
    company_name: str
    category: str | None = None
    location: str | None = None
    description: str | None = None


class VendorOut(BaseModel):
    id: UUID
    user_id: UUID
    company_name: str
    category: str | None
    location: str | None
    description: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class DocumentOut(BaseModel):
    id: UUID
    project_id: UUID | None = None
    file_name: str
    file_type: str
    status: str
    uploaded_at: datetime

    model_config = {"from_attributes": True}


class AgentMessageRequest(BaseModel):
    message: str


class AgentRunOut(BaseModel):
    id: UUID
    project_id: UUID
    user_message: str
    final_response: str | None
    status: str
    started_at: datetime
    completed_at: datetime | None

    model_config = {"from_attributes": True}


class AuditLogOut(BaseModel):
    id: UUID
    actor_type: str
    action: str
    entity_type: str
    entity_id: UUID | None
    confidence_score: Decimal | None
    source_reference: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class BoqItemPatch(BaseModel):
    quantity: Decimal | None = None
    item_name: str | None = None
    is_verified: bool | None = None
    confidence_score: Decimal | None = None


class VerificationAction(BaseModel):
    new_value: dict | None = None
    comment: str | None = None


class CatalogItemPatch(BaseModel):
    item_name: str | None = None
    category: str | None = None
    unit: str | None = None
    unit_price: Decimal | None = None
    available_quantity: Decimal | None = None
    is_verified: bool | None = None


class RfqCreate(BaseModel):
    boq_id: UUID | None = None
    boq_item_ids: list[UUID] | None = None
    vendor_ids: list[UUID] = Field(default_factory=list)
    deadline: datetime | None = None


class QuotationLineIn(BaseModel):
    rfq_line_item_id: UUID
    catalog_item_id: UUID | None = None
    unit_price: Decimal
    quantity: Decimal
    lead_time: str | None = None
    notes: str | None = None


class QuotationCreate(BaseModel):
    vendor_id: UUID | None = None
    currency: str = "USD"
    lines: list[QuotationLineIn]


class RoleUpdate(BaseModel):
    role: str = Field(pattern="^(customer|vendor|admin)$")


class AdminOverview(BaseModel):
    users: int
    customers: int
    vendors: int
    admins: int
    projects: int
    vendor_profiles: int
    open_flags: int


class AdminProjectOut(ProjectOut):
    owner_email: str
    owner_name: str


class RateUpdate(BaseModel):
    unit_rate: Decimal = Field(gt=0)
    currency: str = Field(min_length=3, max_length=8)


class AdminRateOut(BaseModel):
    id: UUID
    item_name: str
    category: str
    unit: str
    default_formula: str
    unit_rate: Decimal
    currency: str
    effective_date: date
