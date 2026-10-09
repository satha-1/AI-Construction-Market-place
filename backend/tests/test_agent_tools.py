"""Tool registry contract + deterministic tool execute tests (no LLM)."""

from __future__ import annotations

from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import MagicMock
from uuid import uuid4

from app.modules.agent.tools import (
    CompareQuotationsTool,
    RequestHumanVerificationTool,
    ToolResult,
    tool_registry,
)


def test_tool_registry_contract():
    schemas = tool_registry.schemas()
    names = {s["name"] for s in schemas}
    expected = {
        "search_project_context",
        "analyze_document",
        "generate_boq",
        "calculate_quantities",
        "calculate_costs",
        "search_vendors",
        "compare_quotations",
        "request_human_verification",
    }
    assert expected <= names
    for schema in schemas:
        tool = tool_registry.resolve(schema["name"])
        assert callable(tool.execute)
        assert schema["name"] == tool.name
        assert "input_schema" in schema


def test_compare_quotations_empty():
    db = MagicMock()
    project_id = uuid4()
    rfq_id = uuid4()
    rfq = SimpleNamespace(id=rfq_id, project_id=project_id)
    db.get.return_value = rfq
    db.scalars.return_value.all.return_value = []

    result = CompareQuotationsTool().execute(db, project_id, rfq_id=str(rfq_id))
    assert result.success
    assert result.data["quotations"] == []
    assert "No quotations" in result.data["summary"]


def test_compare_quotations_ranks_lowest_first():
    db = MagicMock()
    project_id = uuid4()
    rfq_id = uuid4()
    vendor_a = uuid4()
    vendor_b = uuid4()
    q_high = SimpleNamespace(id=uuid4(), vendor_id=vendor_a, total_price=Decimal("1200"), currency="USD", status="submitted", rfq_id=rfq_id)
    q_low = SimpleNamespace(id=uuid4(), vendor_id=vendor_b, total_price=Decimal("900"), currency="USD", status="submitted", rfq_id=rfq_id)
    rfq = SimpleNamespace(id=rfq_id, project_id=project_id)
    vendors = {
        vendor_a: SimpleNamespace(company_name="High Co"),
        vendor_b: SimpleNamespace(company_name="Low Co"),
    }

    def get_side(_model, key):
        if key == rfq_id or str(key) == str(rfq_id):
            return rfq
        return vendors.get(key)

    db.get.side_effect = get_side
    db.scalars.side_effect = [
        MagicMock(all=lambda: [q_high, q_low]),
        MagicMock(all=lambda: [SimpleNamespace(lead_time="5 days")]),
        MagicMock(all=lambda: [SimpleNamespace(lead_time="3 days")]),
    ]

    result = CompareQuotationsTool().execute(db, project_id, rfq_id=str(rfq_id))
    assert result.success
    assert result.data["quotations"][0]["company_name"] == "Low Co"
    assert result.data["lowest_quotation_id"] == str(q_low.id)
    assert "Low Co" in result.data["summary"]


def test_request_human_verification_creates_flag():
    db = MagicMock()
    project_id = uuid4()
    entity_id = uuid4()
    flag_id = uuid4()

    def refresh(obj):
        obj.id = flag_id

    db.refresh.side_effect = refresh
    result = RequestHumanVerificationTool().execute(
        db,
        project_id,
        entity_type="boq_item",
        entity_id=str(entity_id),
        reason="low_confidence",
        confidence_score=0.3,
    )
    assert result.success
    assert db.add.called
    assert db.commit.called
    assert result.data["flag_id"] == str(flag_id)


def test_tool_result_shape():
    ok = ToolResult(success=True, data={"x": 1}, confidence_score=0.8, citations=[{"chunk": 1}])
    assert ok.model_dump()["citations"][0]["chunk"] == 1
    bad = ToolResult(success=False, error="boom")
    assert bad.error == "boom"
