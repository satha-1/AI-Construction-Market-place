"""Single-agent orchestrator with bounded tool loop."""

from __future__ import annotations

from datetime import datetime, timezone
from time import perf_counter
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.agent import AgentRun, AgentToolCall
from app.models.boq import Boq
from app.models.project import Project
from app.models.requirement import ExtractedRequirement
from app.models.verification import UncertaintyFlag
from app.modules.agent.llm import llm_client
from app.modules.agent.tools import tool_registry
from app.modules.audit.service import audit_logger
from app.modules.rag.retriever import hybrid_retriever

MAX_STEPS = 6


class AgentOrchestrator:
    def run(self, db: Session, *, project_id: UUID, user_id: UUID, message: str) -> AgentRun:
        project = db.get(Project, project_id)
        assert project is not None

        run = AgentRun(
            project_id=project_id,
            user_id=user_id,
            user_message=message,
            status="running",
        )
        db.add(run)
        db.flush()

        context_summary = self._assemble_context(db, project_id, message)
        history: list[dict] = []
        final_answer = None
        escalated = False

        for _ in range(MAX_STEPS):
            decision = llm_client.decide_next_action(
                user_message=message,
                context_summary=context_summary,
                tool_schemas=tool_registry.schemas(),
                history=history,
            )
            if decision.type == "final_answer":
                final_answer = decision.final_answer
                break

            tool_name = decision.tool_name or "search_project_context"
            args = decision.args or {}
            if tool_name == "search_project_context" and "query" not in args:
                args["query"] = message
            if tool_name == "compare_quotations" and "rfq_id" not in args:
                args = dict(args)

            started = perf_counter()
            try:
                tool = tool_registry.resolve(tool_name)
                result = tool.execute(db, project_id, **args)
            except Exception as exc:  # noqa: BLE001
                from app.modules.agent.tools import ToolResult

                result = ToolResult(success=False, error=str(exc))
            latency = int((perf_counter() - started) * 1000)

            db.add(
                AgentToolCall(
                    run_id=run.id,
                    tool_name=tool_name,
                    input_args=args,
                    output_result=result.model_dump(),
                    latency_ms=latency,
                )
            )
            history.append({"tool_name": tool_name, "args": args, "result": result.model_dump()})

            if not result.success:
                final_answer = f"Tool `{tool_name}` failed: {result.error}"
                break
            if result.confidence_score is not None and result.confidence_score < 0.4:
                escalate = tool_registry.resolve("request_human_verification")
                entity = (result.data or {}).get("requirements") or (result.data or {}).get("matches")
                entity_id = project_id
                if isinstance(entity, list) and entity:
                    entity_id = entity[0].get("id") or entity[0].get("catalog_item_id") or project_id
                escalate.execute(
                    db,
                    project_id,
                    entity_type="agent_result",
                    entity_id=str(entity_id),
                    reason="low_confidence",
                    confidence_score=result.confidence_score,
                )
                escalated = True
                final_answer = (
                    f"Escalated after `{tool_name}` due to low confidence "
                    f"({result.confidence_score:.2f}). Check the verification queue."
                )
                break

            context_summary += f"\nTool {tool_name}: {result.data}"

        open_flags = db.scalars(
            select(UncertaintyFlag).where(
                UncertaintyFlag.project_id == project_id,
                UncertaintyFlag.status == "open",
            )
        ).all()
        if final_answer is None:
            final_answer = self._default_summary(db, project_id, history, open_flags)

        run.final_response = final_answer
        run.status = "escalated" if escalated or open_flags and "escalat" in (final_answer or "").lower() else "completed"
        if escalated:
            run.status = "escalated"
        run.completed_at = datetime.now(timezone.utc)
        audit_logger.log_event(
            db,
            actor_type="ai",
            action="agent.run",
            entity_type="agent_runs",
            entity_id=run.id,
            user_id=user_id,
            project_id=project_id,
            after={"status": run.status, "tools": [h["tool_name"] for h in history]},
            source_reference="AgentOrchestrator",
        )
        db.commit()
        db.refresh(run)
        return run

    def _assemble_context(self, db: Session, project_id: UUID, message: str) -> str:
        project = db.get(Project, project_id)
        req_count = len(db.scalars(select(ExtractedRequirement).where(ExtractedRequirement.project_id == project_id)).all())
        boq = db.scalar(select(Boq).where(Boq.project_id == project_id).order_by(Boq.version.desc()))
        hits = hybrid_retriever.search(db, project_id=project_id, query=message, k=4)
        chunk_preview = " | ".join(h.content[:120].replace("\n", " ") for h in hits)
        return (
            f"Project={project.name if project else project_id} status={project.status if project else '?'} "
            f"requirements={req_count} boq_version={boq.version if boq else 'none'} "
            f"chunks={chunk_preview}"
        )

    def _default_summary(self, db: Session, project_id: UUID, history: list[dict], flags) -> str:
        tools = ", ".join(h["tool_name"] for h in history) or "none"
        return (
            f"Finished agent run using tools: {tools}. "
            f"Open verification flags: {len(flags)}. "
            "Open BOQ / Estimate / Verification pages to review results."
        )


agent_orchestrator = AgentOrchestrator()
