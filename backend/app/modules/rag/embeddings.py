"""Embedding client — OpenAI when keyed, deterministic local hash vectors otherwise."""

from __future__ import annotations

import hashlib
import math
import struct

from app.core.config import settings

DIM = 1536


def _hash_embedding(text: str) -> list[float]:
    digest = hashlib.sha256(text.encode("utf-8")).digest()
    values: list[float] = []
    seed = digest
    while len(values) < DIM:
        seed = hashlib.sha256(seed).digest()
        for i in range(0, len(seed), 4):
            if len(values) >= DIM:
                break
            (n,) = struct.unpack("!I", seed[i : i + 4])
            values.append((n / 2**32) * 2 - 1)
    # L2 normalize
    norm = math.sqrt(sum(v * v for v in values)) or 1.0
    return [v / norm for v in values]


class EmbeddingClient:
    def embed(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        if settings.openai_api_key:
            try:
                from openai import OpenAI

                client = OpenAI(api_key=settings.openai_api_key)
                response = client.embeddings.create(model=settings.embedding_model, input=texts)
                return [item.embedding for item in response.data]
            except Exception:
                pass
        return [_hash_embedding(t) for t in texts]


embedding_client = EmbeddingClient()
