from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user, require_roles
from app.db.session import get_db
from app.models.boq import Boq, BoqItem, Estimate
from app.models.project import Project
from app.models.user import User
from app.models.verification import UncertaintyFlag
from app.modules.audit.service import audit_logger
from app.modules.boq import service as boq_service
from app.modules.matching.engine import match_vendors_for_project
from app.schemas import BoqItemPatch

router = APIRouter(tags=["boq"])


def _project_or_403(db: Session, project_id: UUID, user: User) -> Project:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    if user.role != "admin" and project.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    return project


@router.post("/api/projects/{project_id}/boq/generate")
def generate_boq(
    project_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("customer", "admin")),
):
    _project_or_403(db, project_id, user)
    try:
        from app.models.requirement import ExtractedRequirement
        from app.modules.agent.tools import AnalyzeDocumentTool

        req = db.scalar(select(ExtractedRequirement.id).where(ExtractedRequirement.project_id == project_id).limit(1))
        if req is None:
            result = AnalyzeDocumentTool().execute(db, project_id)
            if not result.success:
                raise HTTPException(status_code=400, detail=result.error or "Analyze failed")
        boq = boq_service.generate_boq_from_requirements(db, project_id, user_id=user.id)
        return {"boq_id": boq.id, "version": boq.version, "item_count": len(boq.items)}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/api/projects/{project_id}/boq")
def get_boq(project_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _project_or_403(db, project_id, user)
    boq = db.scalar(select(Boq).where(Boq.project_id == project_id).order_by(Boq.version.desc()))
    if boq is None:
        return {"boq": None, "items": []}
    return {
        "boq": {"id": boq.id, "version": boq.version, "status": boq.status},
        "items": [
            {
                "id": item.id,
                "item_name": item.item_name,
                "category": item.category,
                "unit": item.unit,
                "quantity": item.quantity,
                "confidence_score": item.confidence_score,
                "is_verified": item.is_verified,
                "calculation_trace": item.calculation_trace,
            }
            for item in boq.items
        ],
    }


@router.patch("/api/boq-items/{item_id}")
def patch_boq_item(
    item_id: UUID,
    payload: BoqItemPatch,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    item = db.get(BoqItem, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="BOQ item not found")
    boq = db.get(Boq, item.boq_id)
    if boq is None:
        raise HTTPException(status_code=404, detail="BOQ not found")
    _project_or_403(db, boq.project_id, user)
    before = {"quantity": str(item.quantity), "item_name": item.item_name}
    if payload.quantity is not None:
        item.quantity = payload.quantity
        if payload.is_verified is None:
            item.is_verified = True
    if payload.item_name is not None:
        item.item_name = payload.item_name
    if payload.is_verified is not None:
        item.is_verified = payload.is_verified
    if payload.confidence_score is not None:
        item.confidence_score = payload.confidence_score
    audit_logger.log_event(
        db,
        actor_type="human",
        action="boq_item.correct",
        entity_type="boq_items",
        entity_id=item.id,
        user_id=user.id,
        project_id=boq.project_id,
        before=before,
        after={"quantity": str(item.quantity), "item_name": item.item_name, "is_verified": item.is_verified},
    )
    db.commit()

    estimate = None
    if payload.quantity is not None:
        try:
            estimate = boq_service.calculate_costs_for_boq(db, boq.project_id, user_id=user.id)
        except ValueError:
            estimate = None

    result = {"id": item.id, "quantity": item.quantity, "item_name": item.item_name, "is_verified": item.is_verified}
    if estimate is not None:
        result["estimate"] = {"id": estimate.id, "total_cost": estimate.total_cost, "currency": estimate.currency}
    return result


@router.post("/api/projects/{project_id}/estimate/calculate")
def calculate_estimate(
    project_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("customer", "admin")),
):
    _project_or_403(db, project_id, user)
    try:
        estimate = boq_service.calculate_costs_for_boq(db, project_id, user_id=user.id)
        return {"estimate_id": estimate.id, "total_cost": estimate.total_cost, "currency": estimate.currency}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Cannot calculate estimate — generate a BOQ with quantities first") from exc


@router.get("/api/projects/{project_id}/estimate")
def get_estimate(project_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _project_or_403(db, project_id, user)
    boq = db.scalar(select(Boq).where(Boq.project_id == project_id).order_by(Boq.version.desc()))
    if boq is None:
        return {"estimate": None, "line_items": []}
    estimate = db.scalar(select(Estimate).where(Estimate.boq_id == boq.id).order_by(Estimate.version.desc()))
    if estimate is None:
        return {"estimate": None, "line_items": []}
    return {
        "estimate": {
            "id": estimate.id,
            "total_cost": estimate.total_cost,
            "currency": estimate.currency,
            "version": estimate.version,
        },
        "line_items": [
            {
                "id": line.id,
                "boq_item_id": line.boq_item_id,
                "unit_rate": line.unit_rate,
                "quantity": line.quantity,
                "line_total": line.line_total,
                "rate_source": line.rate_source,
            }
            for line in estimate.line_items
        ],
    }


@router.get("/api/projects/{project_id}/verification-queue")
def verification_queue(project_id: UUID, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _project_or_403(db, project_id, user)
    flags = db.scalars(
        select(UncertaintyFlag)
        .where(UncertaintyFlag.project_id == project_id, UncertaintyFlag.status == "open")
        .order_by(UncertaintyFlag.created_at.desc())
    ).all()
    return [
        {
            "id": flag.id,
            "entity_type": flag.entity_type,
            "entity_id": flag.entity_id,
            "reason": flag.reason,
            "confidence_score": flag.confidence_score,
            "status": flag.status,
        }
        for flag in flags
    ]


@router.post("/api/projects/{project_id}/vendor-search")
def vendor_search(
    project_id: UUID,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
    category: str | None = None,
    budget: float | None = None,
):
    _project_or_403(db, project_id, user)
    return {"matches": match_vendors_for_project(db, project_id, category=category, budget=budget)}
