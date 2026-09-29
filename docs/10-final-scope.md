# 10. Final Project Scope

## Core MVP

An AI-powered construction estimation and vendor marketplace platform where **customers** upload project documents (PDF drawings, images, Excel/CSV BOQs) and receive an AI-assisted preliminary Bill of Quantities and cost estimate — with explicit confidence scores and human verification for uncertain items — while **vendors** upload catalogs/BOQs that are extracted and standardized into a searchable marketplace. A single **AI agent orchestrator**, using a registry of 8 tools, connects document understanding, a deterministic calculation engine, retrieval-augmented search, and vendor matching, culminating in an RFQ → quotation → comparison workflow, with AI estimates and vendor quotations kept strictly separate throughout.

## Main Modules

Auth · Project Management · Document Processing · RAG/Retrieval · BOQ & Estimation Engine · AI Agent Orchestrator · Vendor Marketplace · Vendor Matching Engine · RFQ & Quotation · Human Verification · Audit Trail · Background Jobs — full detail in [01-architecture.md](./01-architecture.md), [02-hld.md](./02-hld.md), and [03-lld.md](./03-lld.md).

## Main User Workflows

**Customer:** Create Project → Upload Documents → AI Understanding → Extract Requirements → Preliminary BOQ → Calculate Quantities/Costs → Detect Uncertainty → Search Marketplace → Match Vendors → Generate RFQ → Receive Quotations → Compare → Human Verification & Approval.

**Vendor:** Register → Create Profile → Upload BOQ/Product/Service Documents → AI Extraction → Standardize/Validate → Store Structured Catalog + Embeddings → Publish → Receive Relevant RFQs → Submit Quotations.

## Research / Technical Contribution

The core academic value is the **AI agent's tool-orchestration behavior**: interpreting a construction task, planning and selecting from a registry of tools (retrieval, document analysis, deterministic calculation, vendor matching, quotation comparison, human escalation), validating results, detecting uncertainty from combined AI-confidence and deterministic-completeness signals, and escalating to a human only when necessary — while cleanly separating LLM-based understanding from deterministic numerical calculation, and combining structured filtering with semantic (vector) retrieval for vendor matching rather than relying on either alone. Full design in [05-ai-agent-design.md](./05-ai-agent-design.md) and [06-rag-design.md](./06-rag-design.md).

## Future Extensions (explicitly post-MVP)

BIM/CAD format support (Revit, IFC, DWG) · structural engineering analysis · real-time vendor inventory sync · payment/escrow processing · full procurement/logistics execution · multi-agent negotiation · expanded construction-codes knowledge base · fine-tuned/self-hosted models · mobile app · advanced analytics dashboards.

## Out of Scope for This MVP

Payment processing, e-signatures/legally binding contracts, BIM formats, structural analysis, real-time inventory, full procurement/logistics, multi-tenant enterprise auth/SSO, microservices/Kubernetes deployment, multi-agent AI architectures, handwriting-quality OCR guarantees, and a comprehensive construction standards knowledge base. Full justification in [08-estimation-plan.md](./08-estimation-plan.md) §8.3.

---

*This document set (`/docs/01` through `/docs/10`) is the single technical blueprint for the 4-member team. All module names, database entities, agent tool names, and workflows are consistent across every document — start with [README.md](./README.md) for navigation.*
