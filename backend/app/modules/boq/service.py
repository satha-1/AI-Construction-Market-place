"""BOQ generation, estimation, and confidence / uncertainty handling."""

from __future__ import annotations

from decimal import Decimal
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.boq import Boq, BoqItem, Estimate, EstimateLineItem
from app.models.project import Project
from app.models.reference import ReferenceItem, ReferenceRate
from app.models.requirement import ExtractedRequirement
from app.models.verification import UncertaintyFlag
from app.modules.audit.service import audit_logger
from app.modules.boq.calculator import cost_calculator, quantity_calculator

CONFIDENCE_THRESHOLD = Decimal("0.60")


def generate_boq_from_requirements(db: Session, project_id: UUID, *, user_id: UUID | None = None) -> Boq:
    requirements = db.scalars(
        select(ExtractedRequirement).where(ExtractedRequirement.project_id == project_id)
    ).all()
    if not requirements:
        raise ValueError("No extracted requirements — run analyze_document first")

    existing = db.scalars(select(Boq).where(Boq.project_id == project_id)).all()
    version = max((b.version for b in existing), default=0) + 1
    boq = Boq(project_id=project_id, version=version, status="draft")
    db.add(boq)
    db.flush()

    refs = {r.item_name.lower(): r for r in db.scalars(select(ReferenceItem)).all()}
    for req in requirements:
        ref = _match_reference(req, refs)
        attrs = req.attributes or {}
        formula = ref.default_formula if ref else attrs.get("formula", "count")
        qty, trace, missing = quantity_calculator.calculate(formula, attrs)
        confidence = Decimal(str(req.confidence_score or "0.5"))
        if missing:
            confidence = min(confidence, Decimal("0.40"))
        item = BoqItem(
            boq_id=boq.id,
            source_requirement_id=req.id,
            item_name=ref.item_name if ref else req.component_type,
            category=ref.category if ref else req.component_type,
            unit=ref.unit if ref else attrs.get("unit", "ea"),
            quantity=qty,
            confidence_score=confidence,
            calculation_trace={**trace, "source_requirement_ids": [str(req.id)]},
            is_verified=bool(req.is_verified and not missing),
        )
        db.add(item)
        db.flush()
        if confidence < CONFIDENCE_THRESHOLD or missing:
            reason = "missing_dimension" if missing else "low_confidence"
            db.add(
                UncertaintyFlag(
                    project_id=project_id,
                    entity_type="boq_item",
                    entity_id=item.id,
                    reason=reason,
                    confidence_score=confidence,
                    status="open",
                )
            )
    project = db.get(Project, project_id)
    if project:
        project.status = "analyzing"
    audit_logger.log_event(
        db,
        actor_type="ai",
        action="boq.generate",
        entity_type="boqs",
        entity_id=boq.id,
        user_id=user_id,
        project_id=project_id,
        after={"version": version, "item_count": len(requirements)},
    )
    db.commit()
    db.refresh(boq)
    return boq


def calculate_costs_for_boq(db: Session, project_id: UUID, *, user_id: UUID | None = None) -> Estimate:
    boq = db.scalar(select(Boq).where(Boq.project_id == project_id).order_by(Boq.version.desc()))
    if boq is None:
        raise ValueError("No BOQ found")
    items = list(boq.items)
    rates = _rate_map(db)
    estimate = Estimate(boq_id=boq.id, total_cost=Decimal("0"), currency="USD", version=1)
    db.add(estimate)
    db.flush()
    total = Decimal("0")
    for item in items:
        if item.quantity is None:
            db.add(
                UncertaintyFlag(
                    project_id=project_id,
                    entity_type="boq_item",
                    entity_id=item.id,
                    reason="missing_dimension",
                    confidence_score=item.confidence_score,
                    status="open",
                )
            )
            continue
        rate = rates.get((item.item_name or "").lower()) or rates.get((item.category or "").lower())
        if rate is None:
            db.add(
                UncertaintyFlag(
                    project_id=project_id,
                    entity_type="boq_item",
                    entity_id=item.id,
                    reason="ambiguous_spec",
                    confidence_score=item.confidence_score,
                    status="open",
                )
            )
            continue
        line_total = cost_calculator.line_total(item.quantity, rate)
        db.add(
            EstimateLineItem(
                estimate_id=estimate.id,
                boq_item_id=item.id,
                unit_rate=rate,
                quantity=item.quantity,
                line_total=line_total,
                rate_source="reference_rates",
            )
        )
        total += line_total
    estimate.total_cost = total
    project = db.get(Project, project_id)
    if project:
        project.status = "estimated"
    audit_logger.log_event(
        db,
        actor_type="ai",
        action="estimate.calculate",
        entity_type="estimates",
        entity_id=estimate.id,
        user_id=user_id,
        project_id=project_id,
        after={"total_cost": str(total)},
    )
    db.commit()
    db.refresh(estimate)
    return estimate


def _match_reference(req: ExtractedRequirement, refs: dict[str, ReferenceItem]) -> ReferenceItem | None:
    key = (req.component_type or "").lower()
    if key in refs:
        return refs[key]
    for name, ref in refs.items():
        if key in name or name in key:
            return ref
    attrs = req.attributes or {}
    item_name = str(attrs.get("item_name", "")).lower()
    if item_name in refs:
        return refs[item_name]
    for name, ref in refs.items():
        if item_name and (item_name in name or name in item_name):
            return ref
    return None


def _rate_map(db: Session) -> dict[str, Decimal]:
    items = db.scalars(select(ReferenceItem)).all()
    rates = db.scalars(select(ReferenceRate)).all()
    by_id = {r.reference_item_id: r.unit_rate for r in rates}
    out: dict[str, Decimal] = {}
    for item in items:
        if item.id in by_id:
            out[item.item_name.lower()] = by_id[item.id]
            out[item.category.lower()] = by_id[item.id]
    return out
