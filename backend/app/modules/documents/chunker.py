"""Split parsed blocks into ~500–800 token chunks with metadata."""

from __future__ import annotations

from dataclasses import dataclass

from app.modules.documents.parsers import ParsedBlock


@dataclass
class Chunk:
    content: str
    chunk_index: int
    metadata: dict


class Chunker:
    def __init__(self, target_chars: int = 2800, overlap_chars: int = 200):
        self.target_chars = target_chars
        self.overlap_chars = overlap_chars

    def chunk(self, blocks: list[ParsedBlock]) -> list[Chunk]:
        chunks: list[Chunk] = []
        buffer = ""
        buffer_meta: dict = {}
        index = 0

        def flush() -> None:
            nonlocal buffer, buffer_meta, index
            text = buffer.strip()
            if not text:
                return
            chunks.append(Chunk(content=text, chunk_index=index, metadata=dict(buffer_meta)))
            index += 1
            if self.overlap_chars > 0 and len(text) > self.overlap_chars:
                buffer = text[-self.overlap_chars :]
            else:
                buffer = ""

        for block in blocks:
            piece = block.text.strip()
            if not piece:
                continue
            if not buffer:
                buffer_meta = dict(block.metadata)
            if len(buffer) + len(piece) + 2 <= self.target_chars:
                buffer = f"{buffer}\n\n{piece}".strip()
                buffer_meta = {**buffer_meta, **block.metadata}
            else:
                flush()
                buffer = piece
                buffer_meta = dict(block.metadata)
                while len(buffer) > self.target_chars:
                    cut = buffer[: self.target_chars]
                    chunks.append(Chunk(content=cut, chunk_index=index, metadata=dict(buffer_meta)))
                    index += 1
                    buffer = buffer[self.target_chars - self.overlap_chars :]
        flush()
        return chunks
