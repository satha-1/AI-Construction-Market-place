"""Matching engine unit tests — structured filters and scoring (no Postgres)."""

from __future__ import annotations

from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import MagicMock, patch
from uuid import uuid4

from app.modules.matching.engine import _rank_catalog
from app.modules.rag.retriever import _cosine
from app.modules.rag.embeddings import _hash_embedding


def _item(**kwargs):
    defaults = dict(
        id=uuid4(),
        vendor_id=uuid4(),
        item_name="OPC Cement 50kg",
        category="Cement",
        unit="bag",
        unit_price=Decimal("10"),
        available_quantity=Decimal("1000"),
        embedding=None,
        is_published=True,
    )
    defaults.update(kwargs)
    return SimpleNamespace(**defaults)


def test_budget_filter_excludes_overpriced():
    cheap = _item(item_name="Budget Cement", unit_price=Decimal("8"))
    dear = _item(item_name="Premium Cement", unit_price=Decimal("50"), vendor_id=uuid4())
    vendor = SimpleNamespace(company_name="Co", location="Colombo")
    db = MagicMock()
    db.scalars.return_value.all.return_value = [cheap, dear]
    db.get.return_value = vendor

    with patch("app.modules.matching.engine.embedding_client") as emb:
        emb.embed.return_value = [[0.1] * 8]
        ranked = _rank_catalog(db, query="cement bag", category="Cement", budget=15.0, location=None, limit=10)

    names = {r["item_name"] for r in ranked}
    assert "Budget Cement" in names
    assert "Premium Cement" not in names


def test_quantity_filter_excludes_insufficient_stock():
    stocked = _item(item_name="In Stock Rebar", available_quantity=Decimal("500"), category="Steel", unit="ton")
    thin = _item(item_name="Low Stock Rebar", available_quantity=Decimal("2"), category="Steel", unit="ton", vendor_id=uuid4())
    vendor = SimpleNamespace(company_name="Steel Co", location="Negombo")
    db = MagicMock()
    db.scalars.return_value.all.return_value = [stocked, thin]
    db.get.return_value = vendor

    with patch("app.modules.matching.engine.embedding_client") as emb:
        emb.embed.return_value = [[0.1] * 8]
        ranked = _rank_catalog(db, query="rebar steel", category="Steel", budget=None, location=None, quantity=100, unit="ton", limit=10)

    names = {r["item_name"] for r in ranked}
    assert "In Stock Rebar" in names
    assert "Low Stock Rebar" not in names


def test_match_score_order_deterministic():
    exact = _item(item_name="TMT Rebar 12mm", category="Steel", unit="ton")
    loose = _item(item_name="Misc hardware", category="Tools", unit="pcs", vendor_id=uuid4())
    vendor = SimpleNamespace(company_name="V", location="Colombo")
    db = MagicMock()
    db.scalars.return_value.all.return_value = [loose, exact]
    db.get.return_value = vendor

    with patch("app.modules.matching.engine.embedding_client") as emb:
        emb.embed.return_value = [_hash_embedding("TMT Rebar 12mm steel")]
        ranked = _rank_catalog(db, query="TMT Rebar 12mm steel", category="Steel", budget=None, location=None, unit="ton", limit=10)

    assert ranked[0]["item_name"] == "TMT Rebar 12mm"
    assert ranked[0]["match_score"] >= ranked[-1]["match_score"]


def test_cosine_similarity_bounds():
    a = _hash_embedding("cement bag OPC")
    b = _hash_embedding("cement bag OPC")
    c = _hash_embedding("totally unrelated electrical cable")
    assert _cosine(a, b) > 0.99
    assert _cosine(a, c) < _cosine(a, b)
