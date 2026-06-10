"""
Seed sample customers and orders from the chromaprintserp mock data.
Run with:  python -m app.seed_customers
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
