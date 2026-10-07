"""Deterministic quantity and cost calculation — no LLM arithmetic."""

from __future__ import annotations

from decimal import Decimal
from typing import Any


class QuantityCalculator:
    FORMULAS = {
        "area": lambda d: d["length"] * d["width"],
        "volume": lambda d: (
            d["length"] * d["width"] * d["height"]
            if "height" in d
            else d["area"] * d["thickness"]
        ),
        "count": lambda d: d["count"],
        "length": lambda d: d.get("length") or d.get("perimeter") or d.get("route_length"),
    }

    REQUIRED = {
        "area": ("length", "width"),
        "volume": (),  # validated specially
        "count": ("count",),
        "length": (),
    }

    def calculate(self, formula: str, attributes: dict[str, Any]) -> tuple[Decimal | None, dict, list[str]]:
        dims = {k: self._to_decimal(v) for k, v in attributes.items() if self._to_decimal(v) is not None}
        missing: list[str] = []
        formula = (formula or "count").lower()

        if formula == "area":
            for key in ("length", "width"):
                if key not in dims:
                    missing.append(key)
        elif formula == "volume":
            if {"length", "width", "height"}.issubset(dims):
                pass
            elif {"area", "thickness"}.issubset(dims):
                pass
            else:
                missing.extend(["length/width/height or area/thickness"])
        elif formula == "count":
            if "count" not in dims:
                missing.append("count")
        elif formula == "length":
            if not any(k in dims for k in ("length", "perimeter", "route_length")):
                missing.append("length|perimeter|route_length")
        else:
            missing.append(f"unknown_formula:{formula}")

        if missing:
            return None, {"formula": formula, "inputs": {k: str(v) for k, v in dims.items()}, "missing": missing}, missing

        qty = self.FORMULAS[formula](dims)
        trace = {
            "formula": formula,
            "inputs": {k: str(v) for k, v in dims.items()},
            "result": str(qty),
        }
        return Decimal(str(qty)), trace, []

    @staticmethod
    def _to_decimal(value: Any) -> Decimal | None:
        if value is None:
            return None
        try:
            return Decimal(str(value))
        except Exception:
            return None


class CostCalculator:
    def line_total(self, quantity: Decimal, unit_rate: Decimal) -> Decimal:
        return (quantity * unit_rate).quantize(Decimal("0.01"))


quantity_calculator = QuantityCalculator()
cost_calculator = CostCalculator()
