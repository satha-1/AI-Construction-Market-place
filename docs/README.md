# AI Construction Estimation & Vendor Marketplace — Technical Blueprint

This `/docs` folder is the **single source of truth** for the 4-member university team building the AI Construction Estimation & Vendor Marketplace platform. Every document here is written to be internally consistent: the same module names, database entities, agent tool names, and tech stack are reused across all files.

## Reading Order

| # | Document | Purpose |
|---|----------|---------|
| 1 | [01-architecture.md](./01-architecture.md) | Overall system architecture, tech stack, deployment view |
| 2 | [02-hld.md](./02-hld.md) | High-level design: modules, responsibilities, data flow, sync/async |
| 3 | [03-lld.md](./03-lld.md) | Low-level design: internal components, APIs, sequence diagrams |
| 4 | [04-database-design.md](./04-database-design.md) | Full schema, ER diagram, table definitions |
| 5 | [05-ai-agent-design.md](./05-ai-agent-design.md) | Agent architecture, tool registry, planning loop, escalation |
| 6 | [06-rag-design.md](./06-rag-design.md) | Document/vendor/knowledge ingestion, retrieval, citations |
| 7 | [07-development-plan.md](./07-development-plan.md) | Week-by-week plan for 4 students over 14–16 weeks |
| 8 | [08-estimation-plan.md](./08-estimation-plan.md) | Effort estimates, MoSCoW classification, explicit non-goals |
| 9 | [09-testing-plan.md](./09-testing-plan.md) | Test strategy per module, acceptance criteria, schedule |
| 10 | [10-final-scope.md](./10-final-scope.md) | One-page executive summary of MVP scope |

## Golden Rules for the Team

1. **One backend, one database, no microservices.** A modular monolith (FastAPI) with a background worker is sufficient and dramatically reduces integration risk for a 4-person, 3–4 month project.
2. **AI proposes, calculation engine disposes.** The LLM never does arithmetic that matters (areas, volumes, costs). It extracts/classifies; a deterministic Python calculation module computes numbers.
3. **One agent, many tools.** No multi-agent frameworks, no agent-to-agent negotiation. A single orchestrator loop with a tool registry, as defined in [05-ai-agent-design.md](./05-ai-agent-design.md).
4. **Every AI output carries a confidence score and a source reference.** If either is missing, the UI must show it as "unverified" and route it to human verification.
5. **Estimate ≠ Quotation.** These are separate tables, separate UI sections, and are never merged in code or in the database.
6. **If a feature isn't in the MVP table in [08-estimation-plan.md](./08-estimation-plan.md), don't build it** — no matter how easy it looks.

## Canonical Naming (used everywhere in these docs)

- **Modules:** Auth, Project Management, Document Processing, RAG/Retrieval, BOQ & Estimation Engine, AI Agent Orchestrator, Vendor Marketplace, Vendor Matching Engine, RFQ & Quotation, Human Verification, Audit Trail, Background Jobs.
- **Agent tools:** `search_project_context`, `analyze_document`, `generate_boq`, `calculate_quantities`, `calculate_costs`, `search_vendors`, `compare_quotations`, `request_human_verification`.
- **Core DB entities:** `users`, `projects`, `project_documents`, `document_chunks`, `extracted_requirements`, `boqs`, `boq_items`, `estimates`, `estimate_line_items`, `uncertainty_flags`, `vendors`, `vendor_documents`, `vendor_catalog_items`, `rfqs`, `rfq_line_items`, `quotations`, `quotation_line_items`, `approvals`, `audit_logs`, `agent_runs`, `agent_tool_calls`.
