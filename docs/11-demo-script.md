# 11. Demo Script (Phase 7)

End-to-end walkthrough for the Conapp marketplace demo. Use seeded accounts after `python -m app.scripts.seed_demo` (password `Demo123!`).

## Prep (2 min)

1. `docker compose up -d db redis minio` (or your usual stack)
2. `cd backend && alembic upgrade head && python -m app.scripts.seed_demo`
3. Start API + frontend (`uvicorn` / `npm run dev`)
4. Optional: set `OPENAI_API_KEY` for richer agent planning; heuristics work without it

## Act 1 — Vendor onboarding (3 min)

1. Log in as `cement.co@conapp.local` (or register a new vendor).
2. Open **Catalog** — seeded items are already published; add one draft, then **Publish**.
3. Open **Company profile** → **View storefront** to show the public marketplace page.
4. Sign out.

## Act 2 — Customer upload & AI estimate (5 min)

1. Log in as `demo.customer@conapp.local`.
2. Open **Riverside Apartments – Block B** (seeded with BOQ + open flags).
3. **Documents** — upload a PDF/CSV with walls/doors if you want a live parse; otherwise skip to BOQ.
4. **Assistant** — “Analyze documents and generate BOQ with costs” (or open seeded BOQ).
5. Point out **confidence badges**, **Calc** formula chips, and open **Verification** flags (low-confidence rebar / wiring).

## Act 3 — Human correction (2 min)

1. On **Verification**, **Correct** a flagged quantity (or correct from **BOQ**).
2. Show toast that the **estimate recalculated**.
3. Open **Audit** — timeline shows before/after and actor badges.

## Act 4 — Vendor matching & RFQ (4 min)

1. **RFQs** → **New RFQ** — ranked vendor list with match scores.
2. Select Island Cement + Lanka Steel (or ElectroPlus) → send.
3. Sign out → log in as a invited vendor → **RFQ inbox** → open RFQ.
4. Fill unit prices, currency, commercial notes → **Submit quotation**.
5. Repeat quickly with a second vendor (or use two browsers).

## Act 5 — Comparison & selection (3 min)

1. Back as customer → open the RFQ.
2. Show **AI comparison summary** + side-by-side table + **Lowest** badge.
3. **Select** a winner → RFQ closes; vendors notified.
4. Optionally show admin **Audit log** with `source_reference` for AI/human actions.

## Talking points

- No LLM arithmetic — quantities/costs come from formulas + reference rates.
- Uncertainty never auto-finalises — humans approve/correct.
- Marketplace, admin, customer, and vendor share one design system.
- Architecture diagrams live in `docs/01`–`docs/06`; development plan in `docs/07`.

## Smoke checklist (pre-demo)

- [ ] Login works for customer, vendor, admin  
- [ ] Marketplace catalog loads  
- [ ] BOQ shows formula + confidence  
- [ ] Verification correct triggers estimate refresh  
- [ ] RFQ compare summary visible with ≥1 quotation  
- [ ] Modals/menus are opaque white panels  
