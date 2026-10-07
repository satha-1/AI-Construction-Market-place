"""Thin LLMClient interface with OpenAI + heuristic fallback."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Any

from app.core.config import settings


@dataclass
class AgentDecision:
    type: str  # tool_call | final_answer
    tool_name: str | None = None
    args: dict[str, Any] | None = None
    final_answer: str | None = None


class LLMClient:
    def decide_next_action(
        self,
        *,
        user_message: str,
        context_summary: str,
        tool_schemas: list[dict],
        history: list[dict],
    ) -> AgentDecision:
        if settings.openai_api_key:
            decision = self._openai_decide(user_message, context_summary, tool_schemas, history)
            if decision:
                return decision
        return self._heuristic_decide(user_message, history)

    def _openai_decide(
        self,
        user_message: str,
        context_summary: str,
        tool_schemas: list[dict],
        history: list[dict],
    ) -> AgentDecision | None:
        try:
            from openai import OpenAI

            client = OpenAI(api_key=settings.openai_api_key)
            tools = [
                {
                    "type": "function",
                    "function": {
                        "name": t["name"],
                        "description": t.get("description", ""),
                        "parameters": t.get("input_schema", {"type": "object", "properties": {}}),
                    },
                }
                for t in tool_schemas
            ]
            messages = [
                {
                    "role": "system",
                    "content": (
                        "You are the Conapp construction estimation agent. "
                        "Use tools for retrieval, BOQ generation, and calculations. "
                        "Never invent quantities or costs — call calculate_* tools. "
                        f"Project context:\n{context_summary}"
                    ),
                },
                *[{"role": "assistant", "content": json.dumps(h)} for h in history[-6:]],
                {"role": "user", "content": user_message},
            ]
            response = client.chat.completions.create(
                model=settings.openai_model,
                messages=messages,
                tools=tools,
                tool_choice="auto",
            )
            msg = response.choices[0].message
            if msg.tool_calls:
                call = msg.tool_calls[0]
                args = json.loads(call.function.arguments or "{}")
                return AgentDecision(type="tool_call", tool_name=call.function.name, args=args)
            return AgentDecision(type="final_answer", final_answer=msg.content or "Done.")
        except Exception:
            return None

    def _heuristic_decide(self, user_message: str, history: list[dict]) -> AgentDecision:
        text = user_message.lower()
        used = {h.get("tool_name") for h in history}

        if any(w in text for w in ("compare", "quotation", "quote")) and "compare_quotations" not in used:
            return AgentDecision(type="tool_call", tool_name="compare_quotations", args={})
        if any(w in text for w in ("vendor", "supplier", "match", "marketplace")) and "search_vendors" not in used:
            return AgentDecision(type="tool_call", tool_name="search_vendors", args={})
        if any(w in text for w in ("cost", "price", "estimate")) and "calculate_costs" not in used:
            if "generate_boq" not in used and "calculate_quantities" not in used:
                return AgentDecision(type="tool_call", tool_name="generate_boq", args={})
            return AgentDecision(type="tool_call", tool_name="calculate_costs", args={})
        if any(w in text for w in ("boq", "bill of quantities", "generate")) and "generate_boq" not in used:
            return AgentDecision(type="tool_call", tool_name="generate_boq", args={})
        if any(w in text for w in ("analyze", "extract", "requirement")) and "analyze_document" not in used:
            return AgentDecision(type="tool_call", tool_name="analyze_document", args={})
        if "search_project_context" not in used:
            return AgentDecision(type="tool_call", tool_name="search_project_context", args={"query": user_message})
        if "analyze_document" not in used and re.search(r"document|drawing|pdf", text):
            return AgentDecision(type="tool_call", tool_name="analyze_document", args={})
        if "generate_boq" not in used:
            return AgentDecision(type="tool_call", tool_name="generate_boq", args={})
        if "calculate_costs" not in used:
            return AgentDecision(type="tool_call", tool_name="calculate_costs", args={})
        return AgentDecision(
            type="final_answer",
            final_answer="Completed available tool steps for this request. Review BOQ, estimate, and verification queue.",
        )


llm_client = LLMClient()
