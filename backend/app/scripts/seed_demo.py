"""Phase 5 demo seed — idempotent users, vendors, catalogs, projects, sample BOQ + flags.

Run from the backend folder (with venv active and Postgres up):

    python -m app.scripts.seed_demo

Default password for every demo account: Demo123!
"""

from __future__ import annotations

from decimal import Decimal

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.core.security import hash_password
from app.models.boq import Boq, BoqItem
from app.models.project import Project
from app.models.user import User
from app.models.vendor import Vendor, VendorCatalogItem
from app.models.verification import UncertaintyFlag

PASSWORD = "Demo123!"

CUSTOMERS = [
    {
        "email": "demo.customer@conapp.local",
        "full_name": "Ava Customer",
        "projects": [
            {
                "name": "Riverside Apartments – Block B",
                "description": "12-unit mid-rise. Structural + MEP drawings uploaded for AI estimate.",
                "location": "Colombo",
                "budget_cap": Decimal("450000"),
                "seed_boq": True,
            },
            {
                "name": "Hillside Villa Renovation",
                "description": "Kitchen/bath refresh plus new boundary wall and driveway.",
                "location": "Kandy",
                "budget_cap": Decimal("85000"),
                "seed_boq": False,
            },
        ],
    },
    {
        "email": "demo.builder@conapp.local",
        "full_name": "Noah Builder",
        "projects": [
            {
                "name": "Harbour Warehouse Fit-out",
                "description": "Industrial shell fit-out: flooring, electrical trunking, roller doors.",
                "location": "Galle",
                "budget_cap": Decimal("220000"),
                "seed_boq": False,
            },
        ],
    },
]

VENDORS = [
    {
        "email": "cement.co@conapp.local",
        "full_name": "Cement Co Sales",
        "company_name": "Island Cement Supply",
        "category": "Cement",
        "location": "Colombo",
        "description": "Bulk OPC and masonry cement for residential and commercial projects.",
        "catalog": [
            ("OPC 42.5 Cement", "Cement", "bag", "8.50", "5000"),
            ("Masonry Cement", "Cement", "bag", "7.20", "3000"),
            ("Ready-mix Concrete C25", "Concrete", "m3", "95.00", "400"),
        ],
    },
    {
        "email": "steel.works@conapp.local",
        "full_name": "Steel Works Sales",
        "company_name": "Lanka Steel Works",
        "category": "Steel",
        "location": "Negombo",
        "description": "Rebar, mesh and structural steel sections with island-wide delivery.",
        "catalog": [
            ("TMT Rebar 12mm", "Steel", "ton", "720.00", "80"),
            ("TMT Rebar 16mm", "Steel", "ton", "710.00", "60"),
            ("Welded Mesh A142", "Steel", "sheet", "28.00", "500"),
        ],
    },
    {
        "email": "electro.plus@conapp.local",
        "full_name": "Electro Plus Sales",
        "company_name": "ElectroPlus Materials",
        "category": "Electrical",
        "location": "Colombo",
        "description": "Cables, switchgear and lighting for residential and light industrial sites.",
        "catalog": [
            ("PVC Cable 2.5mm", "Electrical", "m", "0.85", "10000"),
            ("MCB 32A Single Pole", "Electrical", "pcs", "4.50", "800"),
            ("LED Panel 18W", "Electrical", "pcs", "12.00", "600"),
        ],
    },
    {
        "email": "plumb.pro@conapp.local",
        "full_name": "Plumb Pro Sales",
        "company_name": "PlumbPro Distributors",
        "category": "Plumbing",
        "location": "Kandy",
        "description": "Pipes, fittings and sanitary ware for contractors.",
        "catalog": [
            ("PVC Pipe 32mm", "Plumbing", "m", "1.40", "4000"),
            ("Gate Valve 25mm", "Plumbing", "pcs", "6.80", "350"),
            ("Ceramic WC Suite", "Plumbing", "set", "145.00", "40"),
        ],
    },
]

SAMPLE_BOQ = [
    ("Brick masonry wall", "Masonry", "m2", "162.00", "0.78", True),
    ("Reinforced concrete slab", "Concrete", "m3", "48.50", "0.72", True),
    ("TMT Rebar 12mm", "Steel", "ton", "6.20", "0.55", False),  # flagged
    ("Interior paint", "Finishes", "m2", "520.00", "0.80", True),
    ("Timber door set", "Doors", "ea", "24", "0.88", True),
    ("Electrical wiring", "Electrical", "m", "1800", "0.48", False),  # flagged
]


def _user(db: Session, email: str, full_name: str, role: str) -> User:
    email = email.lower()
    user = db.scalar(select(User).where(User.email == email))
    if user:
        return user
    user = User(email=email, password_hash=hash_password(PASSWORD), full_name=full_name, role=role, is_active=True)
    db.add(user)
    db.flush()
    return user


def _seed_boq(db: Session, project: Project) -> tuple[int, int]:
    existing = db.scalar(select(Boq).where(Boq.project_id == project.id))
    if existing:
        return 0, 0
    boq = Boq(project_id=project.id, version=1, status="draft")
    db.add(boq)
    db.flush()
    items = 0
    flags = 0
    for name, category, unit, qty, conf, verified in SAMPLE_BOQ:
        item = BoqItem(
            boq_id=boq.id,
            item_name=name,
            category=category,
            unit=unit,
            quantity=Decimal(qty),
            confidence_score=Decimal(conf),
            is_verified=verified,
            calculation_trace={
                "formula": "count" if unit in {"ea", "set"} else "area" if unit == "m2" else "volume" if unit == "m3" else "length",
                "inputs": {"seeded": True},
                "result": qty,
            },
        )
        db.add(item)
        db.flush()
        items += 1
        if not verified:
            db.add(
                UncertaintyFlag(
                    project_id=project.id,
                    entity_type="boq_item",
                    entity_id=item.id,
                    reason="low_confidence",
                    confidence_score=Decimal(conf),
                    status="open",
                )
            )
            flags += 1
    project.status = "estimated"
    return items, flags


def seed() -> None:
    # Fail fast if Postgres is down instead of hanging for minutes.
    engine = create_engine(settings.database_url, pool_pre_ping=True, connect_args={"connect_timeout": 5})
    SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    db = SessionLocal()
    try:
        created_users = created_vendors = created_items = created_projects = 0
        created_boq_items = created_flags = 0

        for row in CUSTOMERS:
            before = db.scalar(select(User).where(User.email == row["email"].lower()))
            user = _user(db, row["email"], row["full_name"], "customer")
            if before is None:
                created_users += 1
            for p in row["projects"]:
                project = db.scalar(select(Project).where(Project.owner_id == user.id, Project.name == p["name"]))
                if project is None:
                    project = Project(
                        owner_id=user.id,
                        name=p["name"],
                        description=p["description"],
                        location=p["location"],
                        budget_cap=p["budget_cap"],
                        status="draft",
                    )
                    db.add(project)
                    db.flush()
                    created_projects += 1
                if p.get("seed_boq"):
                    bi, fl = _seed_boq(db, project)
                    created_boq_items += bi
                    created_flags += fl

        for row in VENDORS:
            before = db.scalar(select(User).where(User.email == row["email"].lower()))
            user = _user(db, row["email"], row["full_name"], "vendor")
            if before is None:
                created_users += 1
            vendor = db.scalar(select(Vendor).where(Vendor.user_id == user.id))
            if vendor is None:
                vendor = Vendor(
                    user_id=user.id,
                    company_name=row["company_name"],
                    category=row["category"],
                    location=row["location"],
                    description=row["description"],
                    status="approved",
                    contact_email=row["email"],
                )
                db.add(vendor)
                db.flush()
                created_vendors += 1
            for name, category, unit, price, qty in row["catalog"]:
                exists = db.scalar(
                    select(VendorCatalogItem).where(
                        VendorCatalogItem.vendor_id == vendor.id,
                        VendorCatalogItem.item_name == name,
                    )
                )
                if exists:
                    continue
                db.add(
                    VendorCatalogItem(
                        vendor_id=vendor.id,
                        item_name=name,
                        category=category,
                        unit=unit,
                        unit_price=Decimal(price),
                        available_quantity=Decimal(qty),
                        confidence_score=Decimal("0.95"),
                        is_verified=True,
                        is_published=True,
                    )
                )
                created_items += 1

        db.commit()
        print("Demo seed complete.")
        print(f"  users created:      {created_users}")
        print(f"  vendors created:    {created_vendors}")
        print(f"  catalog items:      {created_items}")
        print(f"  projects created:   {created_projects}")
        print(f"  BOQ items seeded:   {created_boq_items}")
        print(f"  open flags seeded:  {created_flags}")
        print()
        print("Login with password Demo123! for example:")
        print("  demo.customer@conapp.local   (customer — Riverside project has BOQ + flags)")
        print("  cement.co@conapp.local       (vendor)")
        print("  (or your ADMIN_EMAIL from .env)")
    finally:
        db.close()
        engine.dispose()


if __name__ == "__main__":
    seed()
