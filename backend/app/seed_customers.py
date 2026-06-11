"""
Seed sample clients and orders (optional demo data).

Prerequisites:
  1. `python -m app.seed` must have been run first (creates the tables).
  2. Virtual environment is activated.

Run from the `backend/` directory:

    # Windows
    venv\\Scripts\\activate
    python -m app.seed_customers

    # macOS / Linux
    source venv/bin/activate
    python -m app.seed_customers

This script is safe to run multiple times — it skips records that already exist.
"""

from .database import SessionLocal
from . import models

CUSTOMERS = [
    "Kingfisher Breweries",
    "Tata Consumer Products",
    "Diageo UK",
    "Anheuser-Busch",
    "Heineken International",
]

ORDERS = {
    "Kingfisher Breweries":    ["Kingfisher Strong 650ml", "Kingfisher Premium 330ml"],
    "Tata Consumer Products":  ["Tata Tea Gold 250g"],
    "Diageo UK":               ["Johnnie Walker Red Label"],
    "Anheuser-Busch":          ["Budweiser 500ml"],
    "Heineken International":  ["Heineken 330ml"],
}


def seed():
    db = SessionLocal()
    try:
        for name in CUSTOMERS:
            existing = db.query(models.Client).filter_by(name=name).first()
            if existing:
                print(f"  Skipping client '{name}' — already exists.")
                client = existing
            else:
                client = models.Client(name=name)
                db.add(client)
                db.flush()
                print(f"  Created client: {name}")

            for order_name in ORDERS.get(name, []):
                exists = db.query(models.Order).filter_by(
                    client_id=client.id, name=order_name
                ).first()
                if not exists:
                    db.add(models.Order(name=order_name, client_id=client.id))
                    print(f"    → Order: {order_name}")
                else:
                    print(f"    → Skipping order '{order_name}' — already exists.")

        db.commit()
        print("Customer seeding complete.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
