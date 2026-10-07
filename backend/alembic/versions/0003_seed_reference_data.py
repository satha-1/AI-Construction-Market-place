from alembic import op
import sqlalchemy as sa

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None

ITEMS = [
    ("Brick masonry wall", "structure", "m2", "area", "45.00"),
    ("Reinforced concrete slab", "structure", "m3", "volume", "180.00"),
    ("Interior paint", "finishes", "m2", "area", "8.50"),
    ("Timber door set", "openings", "ea", "count", "220.00"),
    ("Aluminum window", "openings", "ea", "count", "310.00"),
    ("Ceramic flooring", "finishes", "m2", "area", "28.00"),
    ("Electrical wiring", "mep", "m", "length", "12.00"),
    ("Plumbing pipe", "mep", "m", "length", "18.00"),
    ("Gypsum ceiling", "finishes", "m2", "area", "22.00"),
    ("Excavation", "earthworks", "m3", "volume", "15.00"),
]


def upgrade() -> None:
    items = sa.table(
        "reference_items",
        sa.column("item_name", sa.Text),
        sa.column("category", sa.Text),
        sa.column("unit", sa.Text),
        sa.column("default_formula", sa.Text),
    )
    op.bulk_insert(
        items,
        [
            {
                "item_name": name,
                "category": cat,
                "unit": unit,
                "default_formula": formula,
            }
            for name, cat, unit, formula, _rate in ITEMS
        ],
    )
    conn = op.get_bind()
    for name, _cat, _unit, _formula, rate in ITEMS:
        conn.execute(
            sa.text(
                """
                INSERT INTO reference_rates (reference_item_id, unit_rate, currency, effective_date)
                SELECT id, :rate, 'USD', CURRENT_DATE FROM reference_items WHERE item_name = :name
                """
            ),
            {"rate": rate, "name": name},
        )


def downgrade() -> None:
    op.execute("DELETE FROM reference_rates")
    op.execute("DELETE FROM reference_items")
