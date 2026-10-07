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
| RFQ create, vendor inbox, quotation submit, compare | Done |

## Demo path

1. Register **customer** → create project → upload PDF/CSV with walls/doors/dimensions.  
2. Open **Agent** → “analyze documents and generate BOQ with costs”.  
3. Review **BOQ**, resolve **Verification** flags.  
4. Register **vendor** → upload catalog CSV → publish items.  
5. Customer **Match vendors** / create **RFQ** → vendor sees inbox → submit quotation → compare.

Set `OPENAI_API_KEY` in `.env` for real LLM planning and image vision; without it the heuristic agent and local embeddings still work.

## Next (Phase 4 polish)

- Richer quotation submission UI  
- Recalculate estimate after every verification correction  
- Retrieval quality test set / demo seed data  
- UI polish for audit timeline and confidence badges  

See `docs/07-development-plan.md`.
