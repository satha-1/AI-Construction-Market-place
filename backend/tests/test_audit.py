"""AuditLogger unit tests — required fields populated on every call."""

from __future__ import annotations

from unittest.mock import MagicMock
from uuid import uuid4

from app.modules.audit.service import AuditLogger


def test_audit_logger_populates_required_fields():
    db = MagicMock()
    logger = AuditLogger()
    pid = uuid4()
    uid = uuid4()
    eid = uuid4()
    row = logger.log_event(
        db,
        actor_type="human",
        action="boq_item.correct",
        entity_type="boq_items",
        entity_id=eid,
        user_id=uid,
        project_id=pid,
        before={"quantity": "10"},
        after={"quantity": "12"},
        source_reference="VerificationTab",
        confidence_score=0.9,
    )
    assert db.add.called
    assert row.actor_type == "human"
    assert row.action == "boq_item.correct"
    assert row.entity_type == "boq_items"
    assert row.entity_id == eid
    assert row.user_id == uid
    assert row.project_id == pid
    assert row.before_value == {"quantity": "10"}
    assert row.after_value == {"quantity": "12"}
    assert row.source_reference == "VerificationTab"
