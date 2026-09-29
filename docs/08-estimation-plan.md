# 8. Estimation Plan

Effort is expressed in **person-days** (1 person-day ≈ 6 focused hours), assuming ~16 working weeks × 4 people × ~4 productive days/week (accounting for classes/other commitments) ≈ **~256 person-days total budget**. The table below allocates the bulk of that budget; some slack is intentionally left unallocated for integration overhead and unknowns.

## 8.1 Effort Estimate by Component

| Component | Person-days | Notes |
|---|---|---|
| Frontend (all screens: customer, vendor, agent chat, verification, marketplace, RFQ) | 42 | Largest single line item; one dedicated owner (A) for the whole project |
| Backend core (Auth, Project Mgmt, Marketplace CRUD, RFQ/Quotation CRUD, Audit) | 30 | Mostly straightforward CRUD + role-based access |
| Database design & migrations | 8 | Front-loaded in Phase 0, small ongoing additions |
| Document processing (upload, parsers, chunking) | 22 | PDF/Excel parsing is moderate effort; vision/OCR for images is the harder sub-piece |
| AI/RAG (embeddings, `HybridRetriever`, citation tracking) | 20 | Mostly integration work against OpenAI APIs + pgvector, manageable |
| AI Agent (`AgentOrchestrator`, `ToolRegistry`, planning loop, validation, escalation) | 26 | Core academic contribution — allocate real time, expect iteration |
| BOQ & deterministic quantity/cost engine | 18 | Formula logic + unit tests; must be rock-solid since it's "the deterministic part" |
| Vendor marketplace (catalog extraction/standardization) | 16 | Reuses document processing; extra effort is standardization/validation rules |
| Vendor matching engine (structured filter + semantic rank) | 14 | Moderate; mostly SQL + pgvector query composition |
| RFQ & quotation workflow | 14 | CRUD-heavy with one non-trivial piece (comparison diff + LLM summary) |
| Human verification workflow | 10 | Generic flag/approval pattern keeps this contained |
| Testing (unit, integration, UAT) | 16 | Concentrated in Phase 6 but unit tests written continuously |
| Deployment/DevOps (Docker Compose, CI, seed data, demo environment) | 8 | Kept intentionally minimal |
| Documentation (this `/docs` set, kept updated, final report) | 6 | Already substantially produced; ongoing maintenance |
| **Subtotal** | **250** | |
| Integration/unknowns buffer | ~6 | Small deliberate slack |

Effort is distributed roughly as: **A** ≈ 42 (frontend) + shared integration weeks; **B** ≈ 30 (backend core) + 14 (RFQ) + 10 (verification) + 8 (DevOps); **C** ≈ 22 (doc processing) + 20 (RAG) + 16 (marketplace extraction); **D** ≈ 26 (agent) + 18 (BOQ engine) + 14 (matching). Testing/docs are shared across all four throughout, not just at the end.

## 8.2 MoSCoW Classification

### Must Have (Core MVP — the project fails its own goals without these)

- User auth with customer/vendor/admin roles
- Project creation and document upload (PDF, image, Excel/CSV)
- Document parsing + chunking + embedding pipeline
- RAG retrieval with citation tracking (`search_project_context`)
- AI extraction of construction requirements with confidence scores
- Preliminary BOQ generation
- Deterministic quantity calculation (area/volume/count/length) for a limited material set
- Deterministic cost calculation using configurable reference rates
- Uncertainty detection (`uncertainty_flags`) and Human Verification workflow (approve/correct/reject)
- Vendor registration, profile, catalog upload, AI extraction of catalog items
- Vendor catalog standardization + publishing
- Vendor matching combining structured filters + semantic similarity
- RFQ creation from BOQ + vendor selection
- Vendor quotation submission
- Quotation comparison (deterministic diff + summary)
- Single AI agent orchestrator with the 8-tool registry and planning loop
- Audit trail for AI decisions, calculations, matches, and human actions
- Clear separation of AI estimate vs vendor quotation in data model and UI

### Should Have (build if Must Haves land on schedule, i.e., by end of Phase 3/Week 11)

- Progressive refinement UX polish (explicit "recalculate with new info" affordance, diff view of what changed)
- `vendor_matches` caching table (instead of recomputing every request)
- WebSocket/SSE live status updates instead of polling
- Admin dashboard for cross-project flag review
- LLM re-rank step on top of vector similarity in vendor matching
- In-app notification polish (read/unread, RFQ deadline reminders)
- Export BOQ/estimate to PDF/Excel
- Basic project-level collaboration (multiple customer users per project)
- Confidence visualization improvements (heatmap over BOQ table)

### Could Have / Future (nice ideas, explicitly not planned for this MVP cycle unless everything else finishes early)

- Multi-language document support
- More construction material categories/formula types beyond the MVP's limited set
- Vendor analytics dashboard (RFQ win rate, catalog performance)
- Fine-tuned/self-hosted embedding or LLM model to reduce API cost
- Mobile-responsive dedicated app (beyond responsive web)
- Automated vendor recommendation notifications ("new RFQs matching your catalog")
- Versioned BOQ diffing UI (compare v1 vs v2 explicitly)

## 8.3 Explicitly OUT of Scope for the 3–4 Month MVP

These must be stated clearly to the grading committee/stakeholders as deliberate scope boundaries, not omissions:

- **BIM formats** (Revit, IFC) and CAD-native formats (DWG) — parsing these correctly is its own multi-month project.
- **Advanced structural engineering analysis** (load calculations, structural safety checks) — this is a distinct engineering discipline, not a document-understanding/estimation problem.
- **Real-time inventory management** for vendors — requires integration with vendor ERP/inventory systems, out of reach for an MVP marketplace.
- **Payment processing / escrow** — introduces financial/legal/compliance complexity disproportionate to a university project.
- **Full procurement execution** (purchase orders, delivery tracking, logistics) — a distinct downstream system from estimation + RFQ.
- **Multi-agent AI systems / agent-to-agent negotiation** — unnecessary complexity; a single orchestrator with tools is sufficient and more gradeable.
- **Enterprise multi-tenancy, SSO, fine-grained org permissions** — single-tenant, simple role-based access is enough.
- **Kubernetes/microservices/service mesh deployment** — Docker Compose on a single VM is appropriate for the scale and grading context.
- **Comprehensive construction codes/standards knowledge base** — the RAG "construction knowledge" layer is intentionally a small curated seed set, not a full codes/standards system.
- **Handwriting recognition / heavily degraded scanned document OCR quality guarantees** — best-effort only; explicitly flagged as low-confidence rather than "solved."
- **Legally binding contracts/e-signatures on quotations** — quotations remain informational records in this system, not binding contracts.

Continue to [09-testing-plan.md](./09-testing-plan.md) for how the Must Have set will be verified.
