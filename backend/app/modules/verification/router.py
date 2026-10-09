from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.boq import BoqItem
from app.models.project import Project
from app.models.requirement import ExtractedRequirement
from app.models.user import User
from app.models.verification import Approval, UncertaintyFlag
from app.modules.audit.service import audit_logger
from app.modules.boq import service as boq_service
from app.schemas import VerificationAction

router = APIRouter(prefix="/api/verification", tags=["verification"])


def _flag_project(db: Session, flag: UncertaintyFlag, user: User) -> Project:
    project = db.get(Project, flag.project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    if user.role != "admin" and project.owner_id != user.id:
        raise HTTPException(status_code=403, detail="Forbidden")
    return project


def _apply_correction(db: Session, flag: UncertaintyFlag, new_value: dict | None) -> None:
    if not new_value:
        return
    if flag.entity_type == "boq_item":
        item = db.get(BoqItem, flag.entity_id)
        if item is None:
            return
        if "quantity" in new_value:
            item.quantity = new_value["quantity"]
        if "item_name" in new_value:
            item.item_name = new_value["item_name"]
        item.is_verified = True
        if item.confidence_score is None or item.confidence_score < 0.8:
            item.confidence_score = 0.9
    elif flag.entity_type == "requirement":
        req = db.get(ExtractedRequirement, flag.entity_id)
        if req is None:
            return
        attrs = dict(req.attributes or {})
        attrs.update(new_value)
        req.attributes = attrs
        req.is_verified = True
        req.confidence_score = 0.9


@router.post("/{flag_id}/approve")
def approve(flag_id: UUID, payload: VerificationAction | None = None, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return _resolve(db, flag_id, user, "approve", payload)


@router.post("/{flag_id}/reject")
def reject(flag_id: UUID, payload: VerificationAction | None = None, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return _resolve(db, flag_id, user, "reject", payload)


@router.post("/{flag_id}/correct")
def correct(flag_id: UUID, payload: VerificationAction, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if payload is None or payload.new_value is None:
        raise HTTPException(status_code=400, detail="new_value required")
    return _resolve(db, flag_id, user, "correct", payload)


def _resolve(db: Session, flag_id: UUID, user: User, action: str, payload: VerificationAction | None):
    flag = db.get(UncertaintyFlag, flag_id)
    if flag is None:
        raise HTTPException(status_code=404, detail="Flag not found")
    project = _flag_project(db, flag, user)
    before = {"status": flag.status, "entity_type": flag.entity_type}
    previous = None
    if flag.entity_type == "boq_item":
        item = db.get(BoqItem, flag.entity_id)
        previous = {"quantity": str(item.quantity) if item else None, "item_name": item.item_name if item else None}
    if action == "correct":
        _apply_correction(db, flag, payload.new_value if payload else None)
    elif action == "approve":
        if flag.entity_type == "boq_item":
            item = db.get(BoqItem, flag.entity_id)
            if item:
                item.is_verified = True
        elif flag.entity_type == "requirement":
            req = db.get(ExtractedRequirement, flag.entity_id)
            if req:
                req.is_verified = True
    flag.status = "resolved"
    approval = Approval(
        flag_id=flag.id,
        user_id=user.id,
        action=action,
        previous_value=previous,
        new_value=payload.new_value if payload else None,
        comment=payload.comment if payload else None,
    )
    db.add(approval)
    audit_logger.log_event(
        db,
        actor_type="human",
        action=f"verification.{action}",
        entity_type="uncertainty_flags",
        entity_id=flag.id,
        user_id=user.id,
        project_id=project.id,
        before=before,
        after={"status": flag.status, "action": action, "new_value": payload.new_value if payload else None},
    )
    db.commit()

    # Phase 4: keep the estimate in sync after human corrections / approvals on BOQ lines.
    estimate = None
    if action in ("correct", "approve") and flag.entity_type == "boq_item":
        try:
            estimate = boq_service.calculate_costs_for_boq(db, project.id, user_id=user.id)
        except ValueError:
            estimate = None

    result: dict = {"flag_id": flag.id, "status": flag.status, "action": action}
    if estimate is not None:
        result["estimate"] = {
            "id": estimate.id,
            "total_cost": estimate.total_cost,
            "currency": estimate.currency,
        }
    return result
