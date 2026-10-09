# Conapp — AI Construction Estimation & Vendor Marketplace

Modular monolith from the `/docs` blueprint: FastAPI + PostgreSQL/pgvector + Redis + MinIO/local storage + Celery + React.

## Quick start

```bash
cp .env.example .env
```

Optional infra (Docker Desktop):

```bash
docker compose up db redis minio minio-init
```

Backend:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

Optional worker (if Redis is up):

```bash
celery -A app.celery_app.celery_app worker --loglevel=info
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

- App: http://localhost:5173  
- API docs: http://localhost:8000/docs  

Uploads fall back to `backend/uploads/` when MinIO is unavailable. Document processing runs via Celery when Redis is up, otherwise synchronously in-process.

## Implemented (Phases 0–3 core)

| Area | Status |
|---|---|
| Auth / JWT / roles | Done |
| Projects CRUD + audit events | Done |
| Document upload → parse → chunk → embed | Done (PDF/Excel/CSV; image via vision or fallback) |
| HybridRetriever + keyword/vector ranking | Done (hash embeddings without OpenAI key) |
| AgentOrchestrator + 8 tools | Done (heuristic planner; OpenAI function-calling when keyed) |
| BOQ generate + Quantity/Cost calculators | Done |
| Uncertainty flags + verification approve/correct/reject | Done |
| Vendor catalog extract/publish + marketplace | Done |
| Vendor matching (structured + semantic) | Done |
| RFQ create, vendor inbox, quotation submit, compare, select | Done |
| Notifications, role dashboards, public marketplace API | Done (migration `0004`) |
| Admin: users (role/activate), vendor moderation, rates, global audit log | Done |

## Frontend structure

One shared component library (`src/components/ui`) and two CSS-variable themes (`src/index.css`):

- **console** (JetBrains Mono blueprint) — admin, customer and vendor workspaces via `layouts/ConsoleLayout`.
- **storefront** (Satoshi, teal) — public marketplace and auth via `layouts/StorefrontLayout`.

| Routes | Role |
|---|---|
| `/marketplace`, `/marketplace/vendors[/:id]` | public |
| `/admin`, `/admin/{users,vendors,projects,rates,audit}` | admin |
| `/dashboard`, `/projects`, `/projects/:id/{boq,verification,rfqs,agent,audit}`, `/projects/:id/rfqs/:rfqId` | customer |
| `/vendor`, `/vendor/{catalog,rfqs,rfqs/:id,quotations,profile}` | vendor |
| `/notifications` | all signed-in |

Run `alembic upgrade head` to apply migration `0004` before using the new screens.

## Demo path

Full Phase 7 walkthrough (seeded accounts, talking points, smoke checklist): [`docs/11-demo-script.md`](docs/11-demo-script.md).

Short path:

1. Seed demo data → log in as `demo.customer@conapp.local` / `Demo123!`.  
2. Open **Riverside** project → **BOQ** / **Verification** → correct a flag (estimate auto-recalcs).  
3. Create **RFQ** → as vendor submit quotation → compare & select.  

Set `OPENAI_API_KEY` in `.env` for real LLM planning and image vision; without it the heuristic agent and local embeddings still work.

## Demo seed (Phase 5)

From `backend/` with the venv active and DB migrated:

```bash
python -m app.scripts.seed_demo
```

Creates sample customers, projects, and 4 approved vendors with published catalogs. Password for all demo accounts: `Demo123!`  
Examples: `demo.customer@conapp.local`, `cement.co@conapp.local`.

## Phases 4–7 status

Delivered through Phase 7: RFQ comparison + auto-recalc, agent run history, audit timeline, solid modals, enriched demo seed + demo script, calculator/matching/tool/orchestrator/retrieval tests, calculation_trace + citations in UI.

See `docs/07-development-plan.md` and `docs/11-demo-script.md`.
