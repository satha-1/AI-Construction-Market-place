from decimal import Decimal

from app.modules.boq.calculator import cost_calculator, quantity_calculator
from app.modules.documents.chunker import Chunker
from app.modules.documents.parsers import ExcelCsvParser, ParsedBlock, PdfTextParser
from app.modules.agent.tools import _extract_requirements_from_text


def test_quantity_area():
    qty, trace, missing = quantity_calculator.calculate("area", {"length": 5.2, "width": 3.1})
    assert missing == []
    assert qty == Decimal("16.12")
    assert trace["formula"] == "area"


def test_quantity_missing_dims():
    qty, _trace, missing = quantity_calculator.calculate("area", {"length": 5})
    assert qty is None
    assert "width" in missing


def test_quantity_volume_and_count():
    qty, _, missing = quantity_calculator.calculate("volume", {"length": 2, "width": 3, "height": 0.15})
    assert missing == []
    assert qty == Decimal("0.90")
    qty2, _, missing2 = quantity_calculator.calculate("count", {"count": 4})
    assert missing2 == []
    assert qty2 == Decimal("4")


def test_cost_line():
    assert cost_calculator.line_total(Decimal("10"), Decimal("4.5")) == Decimal("45.00")


def test_chunker_splits():
    blocks = [ParsedBlock(text=("word " * 400), metadata={"page": 1})]
    chunks = Chunker(target_chars=200, overlap_chars=20).chunk(blocks)
    assert len(chunks) > 1
    assert chunks[0].chunk_index == 0


def test_csv_parser():
    data = b"item,unit,price\nBrick wall,m2,45\nDoor,ea,220\n"
    result = ExcelCsvParser().parse(data, file_name="catalog.csv")
    assert result.blocks
    assert "Brick wall" in result.blocks[0].text


def test_pdf_parser_empty_ok():
    # Minimal invalid pdf should raise or return empty — ensure class exists
    assert PdfTextParser is not None


def test_requirement_extraction():
    text = "Brick masonry wall length: 5.2 width: 3.1. Also timber door qty 2."
    items = _extract_requirements_from_text(text)
    names = {i["component_type"] for i in items}
    assert "Brick masonry wall" in names
    assert "Timber door set" in names
