# 4. Database Design

**Engine:** PostgreSQL 15 with the `pgvector` extension (`CREATE EXTENSION vector;`). One database, one schema (`public`) is sufficient for MVP — no schema-per-tenant, no sharding.

## 4.1 ER Diagram

```mermaid
erDiagram
    USERS ||--o{ PROJECTS : owns
    USERS ||--o| VENDORS : "is (if role=vendor)"
    PROJECTS ||--o{ PROJECT_DOCUMENTS : contains
    PROJECT_DOCUMENTS ||--o{ DOCUMENT_CHUNKS : "split into"
    PROJECTS ||--o{ EXTRACTED_REQUIREMENTS : yields
    DOCUMENT_CHUNKS ||--o{ EXTRACTED_REQUIREMENTS : "source of"
    PROJECTS ||--o{ BOQS : has
    BOQS ||--o{ BOQ_ITEMS : contains
    EXTRACTED_REQUIREMENTS ||--o{ BOQ_ITEMS : "derived from"
    BOQS ||--o{ ESTIMATES : "priced by"
    ESTIMATES ||--o{ ESTIMATE_LINE_ITEMS : contains
    BOQ_ITEMS ||--o{ ESTIMATE_LINE_ITEMS : "costed as"
    BOQ_ITEMS ||--o{ UNCERTAINTY_FLAGS : "may raise"
    EXTRACTED_REQUIREMENTS ||--o{ UNCERTAINTY_FLAGS : "may raise"
    UNCERTAINTY_FLAGS ||--o{ APPROVALS : "resolved by"
    VENDORS ||--o{ VENDOR_DOCUMENTS : uploads
    VENDOR_DOCUMENTS ||--o{ VENDOR_CATALOG_ITEMS : yields
    PROJECTS ||--o{ RFQS : creates
    BOQS ||--o{ RFQS : "based on"
    RFQS ||--o{ RFQ_LINE_ITEMS : contains
    BOQ_ITEMS ||--o{ RFQ_LINE_ITEMS : references
    RFQS ||--o{ QUOTATIONS : receives
    VENDORS ||--o{ QUOTATIONS : submits
    QUOTATIONS ||--o{ QUOTATION_LINE_ITEMS : contains
    RFQ_LINE_ITEMS ||--o{ QUOTATION_LINE_ITEMS : "quoted against"
    VENDOR_CATALOG_ITEMS ||--o{ QUOTATION_LINE_ITEMS : "priced from"
    PROJECTS ||--o{ AGENT_RUNS : triggers
    AGENT_RUNS ||--o{ AGENT_TOOL_CALLS : executes
    USERS ||--o{ APPROVALS : performs
    USERS ||--o{ AUDIT_LOGS : performs

    USERS {
        uuid id PK
        string email
        string password_hash
        enum role "customer|vendor|admin"
        string full_name
        timestamp created_at
    }
    PROJECTS {
        uuid id PK
        uuid owner_id FK
        string name
        text description
        enum status "draft|analyzing|estimated|sourcing|quoted|closed"
        decimal budget_cap
        string location
        timestamp created_at
        timestamp updated_at
    }
    PROJECT_DOCUMENTS {
        uuid id PK
        uuid project_id FK
        string file_name
        string file_type "pdf|image|excel|csv"
        string storage_path
        enum status "pending|processing|processed|failed"
        jsonb parse_metadata
        timestamp uploaded_at
    }
    DOCUMENT_CHUNKS {
        uuid id PK
        uuid document_id FK
        int chunk_index
        text content
        jsonb metadata "page/sheet/section"
        vector embedding "1536-dim"
        timestamp created_at
    }
    EXTRACTED_REQUIREMENTS {
        uuid id PK
        uuid project_id FK
        uuid source_document_id FK
        uuid source_chunk_id FK
        string component_type "e.g. wall, door, flooring"
        jsonb attributes "dimensions, spec, material"
        decimal confidence_score
        boolean is_verified
        timestamp created_at
    }
    BOQS {
        uuid id PK
        uuid project_id FK
        int version
        enum status "draft|reviewed|final"
        timestamp created_at
    }
    BOQ_ITEMS {
        uuid id PK
        uuid boq_id FK
        uuid source_requirement_id FK
        string item_name
        string category
        string unit
        decimal quantity
        decimal confidence_score
        jsonb calculation_trace "formula + inputs used"
        boolean is_verified
    }
    ESTIMATES {
        uuid id PK
        uuid boq_id FK
        decimal total_cost
        string currency
        int version
        timestamp created_at
    }
    ESTIMATE_LINE_ITEMS {
        uuid id PK
        uuid estimate_id FK
        uuid boq_item_id FK
        decimal unit_rate
        decimal quantity
        decimal line_total
        string rate_source "reference_rates|vendor_avg|manual"
    }
    UNCERTAINTY_FLAGS {
        uuid id PK
        uuid project_id FK
        string entity_type "requirement|boq_item|vendor_match"
        uuid entity_id
        string reason "missing_dimension|low_confidence|ambiguous_spec|conflicting_sources"
        decimal confidence_score
        enum status "open|resolved"
        timestamp created_at
    }
    APPROVALS {
        uuid id PK
        uuid flag_id FK
        uuid user_id FK
        enum action "approve|reject|correct"
        jsonb previous_value
        jsonb new_value
        text comment
        timestamp created_at
    }
    VENDORS {
        uuid id PK
        uuid user_id FK
        string company_name
        string category
        string location
        text description
        timestamp created_at
    }
    VENDOR_DOCUMENTS {
        uuid id PK
        uuid vendor_id FK
        string file_name
        string file_type "pdf|image|excel|csv"
        string storage_path
        enum status "pending|processing|processed|failed"
        timestamp uploaded_at
    }
    VENDOR_CATALOG_ITEMS {
        uuid id PK
        uuid vendor_id FK
        uuid source_document_id FK
        string item_name
        string category
        jsonb specifications
        string unit
        decimal available_quantity
        decimal unit_price
        decimal confidence_score
        boolean is_verified
        boolean is_published
        vector embedding "1536-dim"
        timestamp created_at
    }
    RFQS {
        uuid id PK
        uuid project_id FK
        uuid boq_id FK
        enum status "open|responded|closed"
        timestamp created_at
        timestamp deadline
    }
    RFQ_LINE_ITEMS {
        uuid id PK
        uuid rfq_id FK
        uuid boq_item_id FK
        decimal requested_quantity
    }
    QUOTATIONS {
        uuid id PK
        uuid rfq_id FK
        uuid vendor_id FK
        enum status "submitted|withdrawn|selected|rejected"
        decimal total_price
        string currency
        timestamp submitted_at
    }
    QUOTATION_LINE_ITEMS {
        uuid id PK
        uuid quotation_id FK
        uuid rfq_line_item_id FK
        uuid catalog_item_id FK
        decimal unit_price
        decimal quantity
        decimal line_total
        string lead_time
        text notes
    }
    AGENT_RUNS {
        uuid id PK
        uuid project_id FK
        uuid user_id FK
        text user_message
        text final_response
        enum status "running|completed|failed|escalated"
        timestamp started_at
        timestamp completed_at
    }
    AGENT_TOOL_CALLS {
        uuid id PK
        uuid run_id FK
        string tool_name
        jsonb input_args
        jsonb output_result
        int latency_ms
        timestamp called_at
    }
    AUDIT_LOGS {
        uuid id PK
        uuid project_id FK
        uuid user_id FK
        string actor_type "ai|human"
        string action
        string entity_type
        uuid entity_id
        jsonb before_value
        jsonb after_value
        decimal confidence_score
        text source_reference
        timestamp created_at
    }
```

## 4.2 Notes on Key Tables

- **`document_chunks.embedding` and `vendor_catalog_items.embedding`** use `pgvector`'s `vector(1536)` type (matching `text-embedding-3-small`). Indexed with an HNSW or IVFFlat index for approximate nearest-neighbor search:
  ```sql
  CREATE INDEX ON document_chunks USING hnsw (embedding vector_cosine_ops);
  CREATE INDEX ON vendor_catalog_items USING hnsw (embedding vector_cosine_ops);
  ```
- **`extracted_requirements.attributes`** is `jsonb` because requirement shape varies by `component_type` (a wall has length/height/thickness; a door has count/size/material). A rigid column-per-attribute schema would not scale across item types within the project timeline.
- **`boq_items.calculation_trace`** stores the exact formula and input values used (e.g., `{"formula": "area = length * width", "inputs": {"length": 5.2, "width": 3.1}, "source_requirement_ids": [...]}`) — this is what makes the audit trail meaningful, not just a log line.
- **`uncertainty_flags`** is intentionally generic (`entity_type` + `entity_id`) rather than three separate flag tables, so the Human Verification Module and its UI can be built once and reused across requirements, BOQ items, and vendor matches.
- **`reference_items` and `reference_rates`** (not shown above, supporting/lookup tables) hold the MVP's controlled vocabulary of construction items and default unit costs — seeded manually by the team for the limited set of materials/activities the MVP supports (see [08-estimation-plan.md](./08-estimation-plan.md)).
  ```sql
  CREATE TABLE reference_items (
    id uuid PRIMARY KEY,
    item_name text NOT NULL,
    category text NOT NULL,
    unit text NOT NULL,
    default_formula text NOT NULL -- 'area' | 'volume' | 'count' | 'length'
  );
  CREATE TABLE reference_rates (
    id uuid PRIMARY KEY,
    reference_item_id uuid REFERENCES reference_items(id),
    unit_rate decimal NOT NULL,
    currency text NOT NULL DEFAULT 'USD',
    effective_date date NOT NULL
  );
  ```
- **`vendor_matches` (optional, Should Have):** if the team wants to persist/cache match results instead of recomputing every time:
  ```sql
  CREATE TABLE vendor_matches (
    id uuid PRIMARY KEY,
    boq_item_id uuid REFERENCES boq_items(id),
    catalog_item_id uuid REFERENCES vendor_catalog_items(id),
    match_score decimal,
    rationale text,
    created_at timestamp DEFAULT now()
  );
  ```
- **Estimate vs Quotation separation is structural, not just semantic:** `estimates`/`estimate_line_items` reference `boq_items` and `reference_rates` only. `quotations`/`quotation_line_items` reference `rfq_line_items` and `vendor_catalog_items` only. There is **no foreign key path from a `quotation` back into an `estimate`** — they are compared side-by-side in application logic/UI, never merged in the schema.

## 4.3 Indexing & Performance Notes (MVP-appropriate)

- Standard B-tree indexes on all foreign keys (`project_id`, `document_id`, `boq_id`, `rfq_id`, `vendor_id`).
- `vendor_catalog_items(category, is_published)` composite index for the Vendor Matching Engine's structured filter step.
- No partitioning, no read replicas, no sharding — dataset size for a student MVP (a handful of demo projects/vendors) will not require it.

Continue to [05-ai-agent-design.md](./05-ai-agent-design.md) for how the agent uses these tables.
