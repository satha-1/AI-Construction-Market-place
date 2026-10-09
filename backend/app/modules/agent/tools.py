"""Agent tool registry and implementations."""

from __future__ import annotations

import re
from decimal import Decimal
from typing import Any
from uuid import UUID

from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.document import ProjectDocument
from app.models.requirement import ExtractedRequirement
from app.models.rfq import Quotation, QuotationLineItem, Rfq
from app.models.vendor import Vendor
from app.models.verification import UncertaintyFlag
from app.modules.boq import service as boq_service
from app.modules.matching.engine import match_vendors_for_project
from app.modules.rag.retriever import hybrid_retriever


class ToolResult(BaseModel):
    success: bool
    data: dict = Field(default_factory=dict)
    confidence_score: float | None = None
    citations: list[dict] = Field(default_factory=list)
    error: str | None = None


class Tool:
    name: str
    description: str
    input_schema: dict

    def execute(self, db: Session, project_id: UUID, **kwargs) -> ToolResult:
        raise NotImplementedError

    def schema(self) -> dict:
        return {
            "name": self.name,
            "description": self.description,
            "input_schema": self.input_schema,
        }


class SearchProjectContextTool(Tool):
    name = "search_project_context"
    description = "Retrieve relevant document chunks for the project"
    input_schema = {
        "type": "object",
        "properties": {"query": {"type": "string"}},
        "required": ["query"],
    }

    def execute(self, db: Session, project_id: UUID, **kwargs) -> ToolResult:
        query = kwargs.get("query") or ""
        hits = hybrid_retriever.search(db, project_id=project_id, query=query, k=8)
        return ToolResult(
            success=True,
            data={"chunks": [{"content": h.content[:800], "score": h.score, "citation": h.citation} for h in hits]},
            confidence_score=hits[0].score if hits else 0.0,
            citations=[h.citation for h in hits],
        )


class AnalyzeDocumentTool(Tool):
    name = "analyze_document"
    description = "Extract construction requirements from project document chunks"
    input_schema = {
        "type": "object",
        "properties": {
            "document_id": {"type": "string"},
            "focus": {"type": "string"},
        },
    }

    def execute(self, db: Session, project_id: UUID, **kwargs) -> ToolResult:
        docs = db.scalars(select(ProjectDocument).where(ProjectDocument.project_id == project_id)).all()
        document_id = kwargs.get("document_id")
        if document_id:
            docs = [d for d in docs if str(d.id) == str(document_id)]
        if not docs:
            return ToolResult(success=False, error="No documents to analyze")

        created = []
        for doc in docs:
            for chunk in doc.chunks:
                extracted = _extract_requirements_from_text(chunk.content)
                for item in extracted:
                    conf = Decimal(str(item["confidence"]))
                    req = ExtractedRequirement(
                        project_id=project_id,
                        source_document_id=doc.id,
                        source_chunk_id=chunk.id,
                        component_type=item["component_type"],
                        attributes=item["attributes"],
                        confidence_score=conf,
                        is_verified=False,
                    )
                    db.add(req)
                    db.flush()
                    created.append({"id": str(req.id), "component_type": req.component_type, "confidence": float(conf)})
                    if conf < Decimal("0.60"):
                        db.add(
                            UncertaintyFlag(
                                project_id=project_id,
                                entity_type="requirement",
                                entity_id=req.id,
                                reason="low_confidence",
                                confidence_score=conf,
                                status="open",
                            )
                        )
        db.commit()
        avg = sum(c["confidence"] for c in created) / len(created) if created else 0.0
        return ToolResult(success=True, data={"requirements": created, "count": len(created)}, confidence_score=avg)


class GenerateBoqTool(Tool):
    name = "generate_boq"
    description = "Generate a draft BOQ from extracted requirements"
    input_schema = {"type": "object", "properties": {}}

    def execute(self, db: Session, project_id: UUID, **kwargs) -> ToolResult:
        try:
            # Ensure requirements exist
            count = db.scalar(
                select(ExtractedRequirement.id).where(ExtractedRequirement.project_id == project_id).limit(1)
            )
            if count is None:
                analyze = AnalyzeDocumentTool().execute(db, project_id)
                if not analyze.success:
                    return analyze
            boq = boq_service.generate_boq_from_requirements(db, project_id)
            return ToolResult(
                success=True,
                data={"boq_id": str(boq.id), "version": boq.version, "item_count": len(boq.items)},
                confidence_score=0.7,
            )
        except Exception as exc:  # noqa: BLE001
            return ToolResult(success=False, error=str(exc))


class CalculateQuantitiesTool(Tool):
    name = "calculate_quantities"
    description = "Recalculate quantities for the latest BOQ"
    input_schema = {"type": "object", "properties": {}}

    def execute(self, db: Session, project_id: UUID, **kwargs) -> ToolResult:
        from app.models.boq import Boq
        from app.modules.boq.calculator import quantity_calculator

        boq = db.scalar(select(Boq).where(Boq.project_id == project_id).order_by(Boq.version.desc()))
        if boq is None:
            return ToolResult(success=False, error="No BOQ")
        updated = 0
        skipped_verified = 0
        for item in boq.items:
            # Phase 4: never overwrite quantities a human has already verified.
            if item.is_verified:
                skipped_verified += 1
                continue
            formula = (item.calculation_trace or {}).get("formula", "count")
            attrs = {}
            if item.source_requirement_id:
                req = db.get(ExtractedRequirement, item.source_requirement_id)
                attrs = (req.attributes if req else {}) or {}
            qty, trace, missing = quantity_calculator.calculate(formula, attrs)
            item.quantity = qty
            item.calculation_trace = {**(item.calculation_trace or {}), **trace}
            if missing:
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
            updated += 1
        db.commit()
        return ToolResult(success=True, data={"updated": updated, "skipped_verified": skipped_verified})


class CalculateCostsTool(Tool):
    name = "calculate_costs"
    description = "Calculate estimate costs from reference rates"
    input_schema = {"type": "object", "properties": {}}

    def execute(self, db: Session, project_id: UUID, **kwargs) -> ToolResult:
        try:
            estimate = boq_service.calculate_costs_for_boq(db, project_id)
            return ToolResult(
                success=True,
                data={"estimate_id": str(estimate.id), "total_cost": str(estimate.total_cost), "currency": estimate.currency},
                confidence_score=0.8,
            )
        except Exception as exc:  # noqa: BLE001
            return ToolResult(success=False, error=str(exc))


class SearchVendorsTool(Tool):
    name = "search_vendors"
    description = "Match vendors/catalog items to BOQ needs"
    input_schema = {
        "type": "object",
        "properties": {"category": {"type": "string"}, "budget": {"type": "number"}},
    }

    def execute(self, db: Session, project_id: UUID, **kwargs) -> ToolResult:
        matches = match_vendors_for_project(
            db,
            project_id,
            category=kwargs.get("category"),
            budget=kwargs.get("budget"),
        )
        return ToolResult(success=True, data={"matches": matches}, confidence_score=0.75 if matches else 0.3)


class CompareQuotationsTool(Tool):
    name = "compare_quotations"
    description = "Compare quotations for the latest or given RFQ"
    input_schema = {"type": "object", "properties": {"rfq_id": {"type": "string"}}}

    def execute(self, db: Session, project_id: UUID, **kwargs) -> ToolResult:
        rfq_id = kwargs.get("rfq_id")
        if rfq_id:
            rfq = db.get(Rfq, rfq_id)
        else:
            rfq = db.scalar(select(Rfq).where(Rfq.project_id == project_id).order_by(Rfq.created_at.desc()))
        if rfq is None:
            return ToolResult(success=False, error="No RFQ found")
        quotes = db.scalars(select(Quotation).where(Quotation.rfq_id == rfq.id)).all()
        rows = []
        for q in quotes:
            lines = db.scalars(select(QuotationLineItem).where(QuotationLineItem.quotation_id == q.id)).all()
            vendor = db.get(Vendor, q.vendor_id)
            lead_times = [l.lead_time for l in lines if l.lead_time]
            rows.append(
                {
                    "quotation_id": str(q.id),
                    "vendor_id": str(q.vendor_id),
                    "company_name": vendor.company_name if vendor else "Vendor",
                    "total_price": str(q.total_price),
                    "currency": q.currency,
                    "line_count": len(lines),
                    "status": q.status,
                    "avg_lead_time": lead_times[0] if lead_times else None,
                }
            )
        rows.sort(key=lambda r: Decimal(r["total_price"]))
        if not rows:
            summary = "No quotations submitted yet. Invite vendors or wait for responses before comparing."
        elif len(rows) == 1:
            summary = (
                f"Only one quotation so far from {rows[0]['company_name']} "
                f"at {rows[0]['total_price']} {rows[0]['currency']}. "
                "Wait for more responses for a meaningful comparison."
            )
        else:
            lowest, second = rows[0], rows[1]
            spread = Decimal(second["total_price"]) - Decimal(lowest["total_price"])
            pct = (spread / Decimal(second["total_price"]) * 100) if Decimal(second["total_price"]) else Decimal("0")
            summary = (
                f"Compared {len(rows)} quotations. "
                f"{lowest['company_name']} is lowest at {lowest['total_price']} {lowest['currency']}, "
                f"{pct:.1f}% below {second['company_name']}. "
                f"Selection remains a human decision — review lead times and coverage before picking a winner."
            )
        return ToolResult(
            success=True,
            data={
                "rfq_id": str(rfq.id),
                "quotations": rows,
                "summary": summary,
                "lowest_quotation_id": rows[0]["quotation_id"] if rows else None,
            },
            confidence_score=0.85 if len(rows) > 1 else 0.5,
        )


class RequestHumanVerificationTool(Tool):
    name = "request_human_verification"
    description = "Escalate an uncertain entity to the human verification queue"
    input_schema = {
        "type": "object",
        "properties": {
            "entity_type": {"type": "string"},
            "entity_id": {"type": "string"},
            "reason": {"type": "string"},
            "confidence_score": {"type": "number"},
        },
        "required": ["entity_type", "entity_id", "reason"],
    }

    def execute(self, db: Session, project_id: UUID, **kwargs) -> ToolResult:
        flag = UncertaintyFlag(
            project_id=project_id,
            entity_type=kwargs["entity_type"],
            entity_id=UUID(str(kwargs["entity_id"])),
            reason=kwargs.get("reason", "low_confidence"),
            confidence_score=Decimal(str(kwargs.get("confidence_score", "0.4"))),
            status="open",
        )
        db.add(flag)
        db.commit()
        db.refresh(flag)
        return ToolResult(success=True, data={"flag_id": str(flag.id)})


class ToolRegistry:
    def __init__(self) -> None:
        tools: list[Tool] = [
            SearchProjectContextTool(),
            AnalyzeDocumentTool(),
            GenerateBoqTool(),
            CalculateQuantitiesTool(),
            CalculateCostsTool(),
            SearchVendorsTool(),
            CompareQuotationsTool(),
            RequestHumanVerificationTool(),
        ]
        self._tools = {t.name: t for t in tools}

    def resolve(self, name: str) -> Tool:
        if name not in self._tools:
            raise KeyError(name)
        return self._tools[name]

    def schemas(self) -> list[dict]:
        return [t.schema() for t in self._tools.values()]


tool_registry = ToolRegistry()


def _extract_requirements_from_text(text: str) -> list[dict[str, Any]]:
    """Rule-based extraction from chunk text for MVP without LLM."""
    results: list[dict[str, Any]] = []
    patterns = [
        ("Brick masonry wall", "area", r"wall|brick|masonry"),
        ("Reinforced concrete slab", "volume", r"slab|concrete|rcc"),
        ("Interior paint", "area", r"paint|painting"),
        ("Timber door set", "count", r"door"),
        ("Aluminum window", "count", r"window"),
        ("Ceramic flooring", "area", r"floor|tiling|ceramic"),
        ("Electrical wiring", "length", r"wiring|electrical|cable"),
        ("Plumbing pipe", "length", r"pipe|plumbing"),
        ("Gypsum ceiling", "area", r"ceiling|gypsum"),
        ("Excavation", "volume", r"excavation|earthwork"),
    ]
    dims = {
        "length": _find_dim(text, ("length", "l=", "l:")),
        "width": _find_dim(text, ("width", "w=", "w:", "breadth")),
        "height": _find_dim(text, ("height", "h=", "h:", "depth", "thickness")),
        "count": _find_dim(text, ("count", "qty", "quantity", "nos", "no.")),
    }
    if dims.get("height") and "thickness" not in text.lower():
        pass
    if "thickness" in text.lower() and dims.get("height"):
        dims["thickness"] = dims["height"]

    lower = text.lower()
    for name, formula, pattern in patterns:
        if re.search(pattern, lower):
            attrs = {k: v for k, v in dims.items() if v is not None}
            attrs["formula"] = formula
            attrs["item_name"] = name
            if formula == "count" and "count" not in attrs:
                attrs["count"] = 1
                confidence = 0.55
            elif formula in {"area", "volume", "length"} and len(attrs) < 2:
                confidence = 0.45
            else:
                confidence = 0.78
            results.append({"component_type": name, "attributes": attrs, "confidence": confidence})
    if not results:
        # Generic fallback line items from non-empty text
        results.append(
            {
                "component_type": "General construction work",
                "attributes": {"formula": "count", "count": 1, "notes": text[:240]},
                "confidence": 0.35,
            }
        )
    return results


def _find_dim(text: str, labels: tuple[str, ...]) -> float | None:
    for label in labels:
        m = re.search(rf"{re.escape(label)}\s*[:=]?\s*(\d+(?:\.\d+)?)", text, re.I)
        if m:
            return float(m.group(1))
    # bare dimension pairs like 5.2m x 3.1m
    m = re.search(r"(\d+(?:\.\d+)?)\s*(?:m|ft)?\s*[x×]\s*(\d+(?:\.\d+)?)", text, re.I)
    if m and "length" in labels:
        return float(m.group(1))
    if m and "width" in labels:
        return float(m.group(2))
    return None
