"""Agent orchestrator tests with a mocked LLM client (no OpenAI, no Postgres writes needed beyond mocks)."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from uuid import uuid4

from app.modules.agent.llm import AgentDecision
from app.modules.agent.orchestrator import AgentOrchestrator
from app.modules.agent.tools import ToolResult


def _project(pid):
    return SimpleNamespace(id=pid, name="Demo Project", status="analyzing", owner_id=uuid4())


def test_orchestrator_runs_scripted_tools_then_answers():
    pid = uuid4()
    uid = uuid4()
    db = MagicMock()
    db.get.return_value = _project(pid)
    db.scalars.return_value.all.return_value = []  # open flags empty
    db.scalar.return_value = None

    decisions = [
        AgentDecision(type="tool_call", tool_name="search_project_context", args={"query": "walls"}),
        AgentDecision(type="final_answer", final_answer="Found wall requirements. Review the BOQ next."),
    ]

    class ScriptedLLM:
        def __init__(self):
            self.i = 0

        def decide_next_action(self, **_kwargs):
            d = decisions[min(self.i, len(decisions) - 1)]
            self.i += 1
            return d

    fake_tool = MagicMock()
    fake_tool.execute.return_value = ToolResult(
        success=True,
        data={"chunks": [{"content": "Brick wall length 5"}]},
        confidence_score=0.8,
        citations=[{"page": 1}],
    )

    orch = AgentOrchestrator()
    with (
        patch("app.modules.agent.orchestrator.llm_client", ScriptedLLM()),
        patch("app.modules.agent.orchestrator.tool_registry") as registry,
        patch("app.modules.agent.orchestrator.hybrid_retriever") as retriever,
        patch("app.modules.agent.orchestrator.audit_logger"),
    ):
        registry.resolve.return_value = fake_tool
        registry.schemas.return_value = [{"name": "search_project_context", "description": "", "input_schema": {}}]
        retriever.search.return_value = []
        run = orch.run(db, project_id=pid, user_id=uid, message="Analyze walls")

    assert run.final_response and "BOQ" in run.final_response
    assert run.status == "completed"
    assert db.add.call_count >= 2  # AgentRun + AgentToolCall
    assert db.commit.called
    fake_tool.execute.assert_called()


def test_orchestrator_escalates_on_low_confidence():
    pid = uuid4()
    uid = uuid4()
    db = MagicMock()
    db.get.return_value = _project(pid)
    db.scalars.return_value.all.return_value = []
    db.scalar.return_value = None

    class LowLLM:
        def decide_next_action(self, **_kwargs):
            return AgentDecision(type="tool_call", tool_name="search_vendors", args={})

    search_tool = MagicMock()
    search_tool.execute.return_value = ToolResult(success=True, data={"matches": []}, confidence_score=0.2)
    escalate_tool = MagicMock()
    escalate_tool.execute.return_value = ToolResult(success=True, data={"flag_id": str(uuid4())})

    def resolve(name):
        return escalate_tool if name == "request_human_verification" else search_tool

    orch = AgentOrchestrator()
    with (
        patch("app.modules.agent.orchestrator.llm_client", LowLLM()),
        patch("app.modules.agent.orchestrator.tool_registry") as registry,
        patch("app.modules.agent.orchestrator.hybrid_retriever") as retriever,
        patch("app.modules.agent.orchestrator.audit_logger"),
    ):
        registry.resolve.side_effect = resolve
        registry.schemas.return_value = []
        retriever.search.return_value = []
        run = orch.run(db, project_id=pid, user_id=uid, message="Find vendors")

    assert run.status == "escalated"
    assert "Escalated" in (run.final_response or "")
    escalate_tool.execute.assert_called()
