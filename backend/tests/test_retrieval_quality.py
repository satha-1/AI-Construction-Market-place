"""Retrieval quality checks — keyword hybrid scoring (deterministic, no OpenAI / DB).

Local hash embeddings are content-addressed (not semantic), so recall@k cases use the
same keyword overlap component HybridRetriever relies on when vectors are weak.
"""

from __future__ import annotations

import json
import re
from pathlib import Path

from app.modules.rag.embeddings import _hash_embedding
from app.modules.rag.retriever import _cosine

FIXTURE = Path(__file__).parent / "fixtures" / "retrieval_cases.json"


def _terms(text: str) -> set[str]:
    return {t for t in re.findall(r"[a-z0-9]+", text.lower()) if len(t) > 2}


def _hybrid_rank(query: str, corpus: list[dict], k: int = 3) -> list[str]:
    q_terms = _terms(query)
    q_vec = _hash_embedding(query)
    scored = []
    for c in corpus:
        c_terms = _terms(c["text"])
        keyword = len(q_terms & c_terms) / max(len(q_terms), 1)
        semantic = max(_cosine(q_vec, _hash_embedding(c["text"])), 0.0)
        # Emphasise keyword for fixture recall (mirrors structured+keyword path in matching).
        score = 0.75 * keyword + 0.25 * semantic
        scored.append((score, c["id"]))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [cid for _, cid in scored[:k]]


def test_retrieval_cases_recall_at_k():
    cases = json.loads(FIXTURE.read_text(encoding="utf-8"))
    corpus = cases["corpus"]
    misses = []
    for case in cases["queries"]:
        top = _hybrid_rank(case["query"], corpus, k=case.get("k", 3))
        expected = set(case["expected_ids"])
        if not expected.intersection(top):
            misses.append((case["query"], top, case["expected_ids"]))
    assert not misses, f"recall@k failures: {misses}"


def test_catalog_style_queries_prefer_matching_category():
    corpus = [
        {"id": "cat-cement", "text": "OPC 42.5 cement bag wholesale Colombo"},
        {"id": "cat-steel", "text": "TMT rebar 12mm steel ton Negombo"},
        {"id": "cat-elec", "text": "PVC electrical cable 2.5mm lighting"},
    ]
    assert _hybrid_rank("need bags of OPC cement for slab", corpus, k=1)[0] == "cat-cement"
    assert _hybrid_rank("buy TMT rebar steel reinforcement", corpus, k=1)[0] == "cat-steel"


def test_identical_embedding_cosine_is_one():
    v = _hash_embedding("reinforced concrete slab")
    assert _cosine(v, v) > 0.999
