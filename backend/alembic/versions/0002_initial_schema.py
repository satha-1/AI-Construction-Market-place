from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TYPE user_role AS ENUM ('customer', 'vendor', 'admin');
        CREATE TYPE project_status AS ENUM ('draft', 'analyzing', 'estimated', 'sourcing', 'quoted', 'closed');
        CREATE TYPE document_status AS ENUM ('pending', 'processing', 'processed', 'failed');
        CREATE TYPE boq_status AS ENUM ('draft', 'reviewed', 'final');
        CREATE TYPE flag_status AS ENUM ('open', 'resolved');
        CREATE TYPE approval_action AS ENUM ('approve', 'reject', 'correct');
        CREATE TYPE rfq_status AS ENUM ('open', 'responded', 'closed');
        CREATE TYPE quotation_status AS ENUM ('submitted', 'withdrawn', 'selected', 'rejected');
        CREATE TYPE agent_run_status AS ENUM ('running', 'completed', 'failed', 'escalated');

        CREATE TABLE users (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            email varchar(255) NOT NULL UNIQUE,
            password_hash varchar(255) NOT NULL,
            role user_role NOT NULL,
            full_name varchar(255) NOT NULL,
            created_at timestamptz NOT NULL DEFAULT now()
        );

        CREATE TABLE projects (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            owner_id uuid NOT NULL REFERENCES users(id),
            name varchar(255) NOT NULL,
            description text,
            status project_status NOT NULL DEFAULT 'draft',
            budget_cap numeric(14, 2),
            location varchar(255),
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE INDEX ix_projects_owner_id ON projects(owner_id);

        CREATE TABLE project_documents (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            file_name varchar(512) NOT NULL,
            file_type varchar(32) NOT NULL,
            storage_path text NOT NULL,
            status document_status NOT NULL DEFAULT 'pending',
            parse_metadata jsonb,
            uploaded_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE INDEX ix_project_documents_project_id ON project_documents(project_id);

        CREATE TABLE document_chunks (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            document_id uuid NOT NULL REFERENCES project_documents(id) ON DELETE CASCADE,
            chunk_index integer NOT NULL,
            content text NOT NULL,
            metadata jsonb,
            embedding vector(1536),
            created_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE INDEX ix_document_chunks_document_id ON document_chunks(document_id);

        CREATE TABLE extracted_requirements (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            source_document_id uuid REFERENCES project_documents(id),
            source_chunk_id uuid REFERENCES document_chunks(id),
            component_type varchar(128) NOT NULL,
            attributes jsonb,
            confidence_score numeric(5, 4),
            is_verified boolean NOT NULL DEFAULT false,
            created_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE INDEX ix_extracted_requirements_project_id ON extracted_requirements(project_id);

        CREATE TABLE boqs (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            version integer NOT NULL DEFAULT 1,
            status boq_status NOT NULL DEFAULT 'draft',
            created_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE INDEX ix_boqs_project_id ON boqs(project_id);

        CREATE TABLE boq_items (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            boq_id uuid NOT NULL REFERENCES boqs(id) ON DELETE CASCADE,
            source_requirement_id uuid REFERENCES extracted_requirements(id),
            item_name varchar(255) NOT NULL,
            category varchar(128),
            unit varchar(32),
            quantity numeric(14, 4),
            confidence_score numeric(5, 4),
            calculation_trace jsonb,
            is_verified boolean NOT NULL DEFAULT false
        );
        CREATE INDEX ix_boq_items_boq_id ON boq_items(boq_id);

        CREATE TABLE estimates (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            boq_id uuid NOT NULL REFERENCES boqs(id) ON DELETE CASCADE,
            total_cost numeric(14, 2) NOT NULL DEFAULT 0,
            currency varchar(8) NOT NULL DEFAULT 'USD',
            version integer NOT NULL DEFAULT 1,
            created_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE INDEX ix_estimates_boq_id ON estimates(boq_id);

        CREATE TABLE estimate_line_items (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            estimate_id uuid NOT NULL REFERENCES estimates(id) ON DELETE CASCADE,
            boq_item_id uuid NOT NULL REFERENCES boq_items(id),
            unit_rate numeric(14, 4) NOT NULL,
            quantity numeric(14, 4) NOT NULL,
            line_total numeric(14, 2) NOT NULL,
            rate_source varchar(32) NOT NULL DEFAULT 'reference_rates'
        );
        CREATE INDEX ix_estimate_line_items_estimate_id ON estimate_line_items(estimate_id);

        CREATE TABLE uncertainty_flags (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            entity_type varchar(64) NOT NULL,
            entity_id uuid NOT NULL,
            reason varchar(64) NOT NULL,
            confidence_score numeric(5, 4),
            status flag_status NOT NULL DEFAULT 'open',
            created_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE INDEX ix_uncertainty_flags_project_id ON uncertainty_flags(project_id);

        CREATE TABLE approvals (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            flag_id uuid NOT NULL REFERENCES uncertainty_flags(id),
            user_id uuid NOT NULL REFERENCES users(id),
            action approval_action NOT NULL,
            previous_value jsonb,
            new_value jsonb,
            comment text,
            created_at timestamptz NOT NULL DEFAULT now()
        );

        CREATE TABLE vendors (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id uuid NOT NULL UNIQUE REFERENCES users(id),
            company_name varchar(255) NOT NULL,
            category varchar(128),
            location varchar(255),
            description text,
            created_at timestamptz NOT NULL DEFAULT now()
        );

        CREATE TABLE vendor_documents (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
            file_name varchar(512) NOT NULL,
            file_type varchar(32) NOT NULL,
            storage_path text NOT NULL,
            status document_status NOT NULL DEFAULT 'pending',
            uploaded_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE INDEX ix_vendor_documents_vendor_id ON vendor_documents(vendor_id);

        CREATE TABLE vendor_catalog_items (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            vendor_id uuid NOT NULL REFERENCES vendors(id) ON DELETE CASCADE,
            source_document_id uuid REFERENCES vendor_documents(id),
            item_name varchar(255) NOT NULL,
            category varchar(128),
            specifications jsonb,
            unit varchar(32),
            available_quantity numeric(14, 4),
            unit_price numeric(14, 4),
            confidence_score numeric(5, 4),
            is_verified boolean NOT NULL DEFAULT false,
            is_published boolean NOT NULL DEFAULT false,
            embedding vector(1536),
            created_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE INDEX ix_vendor_catalog_items_vendor_id ON vendor_catalog_items(vendor_id);
        CREATE INDEX ix_vendor_catalog_items_category_published
            ON vendor_catalog_items(category, is_published);

        CREATE TABLE rfqs (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            boq_id uuid NOT NULL REFERENCES boqs(id),
            status rfq_status NOT NULL DEFAULT 'open',
            created_at timestamptz NOT NULL DEFAULT now(),
            deadline timestamptz
        );
        CREATE INDEX ix_rfqs_project_id ON rfqs(project_id);

        CREATE TABLE rfq_line_items (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            rfq_id uuid NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
            boq_item_id uuid NOT NULL REFERENCES boq_items(id),
            requested_quantity numeric(14, 4) NOT NULL
        );
        CREATE INDEX ix_rfq_line_items_rfq_id ON rfq_line_items(rfq_id);

        CREATE TABLE rfq_vendors (
            rfq_id uuid NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
            vendor_id uuid NOT NULL REFERENCES vendors(id),
            PRIMARY KEY (rfq_id, vendor_id)
        );

        CREATE TABLE quotations (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            rfq_id uuid NOT NULL REFERENCES rfqs(id) ON DELETE CASCADE,
            vendor_id uuid NOT NULL REFERENCES vendors(id),
            status quotation_status NOT NULL DEFAULT 'submitted',
            total_price numeric(14, 2) NOT NULL DEFAULT 0,
            currency varchar(8) NOT NULL DEFAULT 'USD',
            submitted_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE INDEX ix_quotations_rfq_id ON quotations(rfq_id);
        CREATE INDEX ix_quotations_vendor_id ON quotations(vendor_id);

        CREATE TABLE quotation_line_items (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            quotation_id uuid NOT NULL REFERENCES quotations(id) ON DELETE CASCADE,
            rfq_line_item_id uuid NOT NULL REFERENCES rfq_line_items(id),
            catalog_item_id uuid REFERENCES vendor_catalog_items(id),
            unit_price numeric(14, 4) NOT NULL,
            quantity numeric(14, 4) NOT NULL,
            line_total numeric(14, 2) NOT NULL,
            lead_time varchar(64),
            notes text
        );

        CREATE TABLE agent_runs (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            user_id uuid NOT NULL REFERENCES users(id),
            user_message text NOT NULL,
            final_response text,
            status agent_run_status NOT NULL DEFAULT 'running',
            started_at timestamptz NOT NULL DEFAULT now(),
            completed_at timestamptz
        );
        CREATE INDEX ix_agent_runs_project_id ON agent_runs(project_id);

        CREATE TABLE agent_tool_calls (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            run_id uuid NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
            tool_name varchar(128) NOT NULL,
            input_args jsonb,
            output_result jsonb,
            latency_ms integer,
            called_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE INDEX ix_agent_tool_calls_run_id ON agent_tool_calls(run_id);

        CREATE TABLE audit_logs (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            project_id uuid REFERENCES projects(id),
            user_id uuid REFERENCES users(id),
            actor_type varchar(16) NOT NULL,
            action varchar(128) NOT NULL,
            entity_type varchar(64) NOT NULL,
            entity_id uuid,
            before_value jsonb,
            after_value jsonb,
            confidence_score numeric(5, 4),
            source_reference text,
            created_at timestamptz NOT NULL DEFAULT now()
        );
        CREATE INDEX ix_audit_logs_project_id ON audit_logs(project_id);

        CREATE TABLE reference_items (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            item_name text NOT NULL,
            category text NOT NULL,
            unit text NOT NULL,
            default_formula text NOT NULL
        );

        CREATE TABLE reference_rates (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            reference_item_id uuid NOT NULL REFERENCES reference_items(id),
            unit_rate numeric(14, 4) NOT NULL,
            currency text NOT NULL DEFAULT 'USD',
            effective_date date NOT NULL DEFAULT CURRENT_DATE
        );
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_document_chunks_embedding
            ON document_chunks USING hnsw (embedding vector_cosine_ops);
        CREATE INDEX IF NOT EXISTS ix_vendor_catalog_items_embedding
            ON vendor_catalog_items USING hnsw (embedding vector_cosine_ops);
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DROP TABLE IF EXISTS quotation_line_items CASCADE;
        DROP TABLE IF EXISTS quotations CASCADE;
        DROP TABLE IF EXISTS rfq_vendors CASCADE;
        DROP TABLE IF EXISTS rfq_line_items CASCADE;
        DROP TABLE IF EXISTS rfqs CASCADE;
        DROP TABLE IF EXISTS vendor_catalog_items CASCADE;
        DROP TABLE IF EXISTS vendor_documents CASCADE;
        DROP TABLE IF EXISTS vendors CASCADE;
        DROP TABLE IF EXISTS approvals CASCADE;
        DROP TABLE IF EXISTS uncertainty_flags CASCADE;
        DROP TABLE IF EXISTS estimate_line_items CASCADE;
        DROP TABLE IF EXISTS estimates CASCADE;
        DROP TABLE IF EXISTS boq_items CASCADE;
        DROP TABLE IF EXISTS boqs CASCADE;
        DROP TABLE IF EXISTS extracted_requirements CASCADE;
        DROP TABLE IF EXISTS document_chunks CASCADE;
        DROP TABLE IF EXISTS project_documents CASCADE;
        DROP TABLE IF EXISTS agent_tool_calls CASCADE;
        DROP TABLE IF EXISTS agent_runs CASCADE;
        DROP TABLE IF EXISTS audit_logs CASCADE;
        DROP TABLE IF EXISTS reference_rates CASCADE;
        DROP TABLE IF EXISTS reference_items CASCADE;
        DROP TABLE IF EXISTS projects CASCADE;
        DROP TABLE IF EXISTS users CASCADE;
        DROP TYPE IF EXISTS user_role;
        DROP TYPE IF EXISTS project_status;
        DROP TYPE IF EXISTS document_status;
        DROP TYPE IF EXISTS boq_status;
        DROP TYPE IF EXISTS flag_status;
        DROP TYPE IF EXISTS approval_action;
        DROP TYPE IF EXISTS rfq_status;
        DROP TYPE IF EXISTS quotation_status;
        DROP TYPE IF EXISTS agent_run_status;
        """
    )
