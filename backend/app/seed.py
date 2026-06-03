"""
Seed the database with the reference data that was hard-coded in the
original front-end (TEETH_DATA and SUBSTRATES).

Run with:  python -m app.seed
"""

from .database import Base, SessionLocal, engine
from . import models

TEETH_DATA = [
    (79, 420), (88, 405), (96, 395), (98, 387), (111, 370),
    (117, 360), (125, 340), (130, 310), (135, 280), (140, 250), (180, 220),
]

SUBSTRATES = [
    ("CA Paper", 8),
    ("Mirror Coat Paper", 14),
    ("Metallise Paper", 21),
    ("Wet Strength Paper", 14),
    ("Metallise Wet Strength", 19),
    ("Metallise Sticker EW", 41),
    ("CA Sticker EW", 27),
    ("IML OP TREOFAN", 15),
    ("IML OP TOPPAN", 12),
    ("IML TP TOPPAN", 15),
    ("PP White (SMI)", 35),
    ("PP Clear", 35),
    ("PP Silver (Avery)", 35),
    ("Clear on Clear", 51),
    ("Cold Foil", 19),
]


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(models.TeethData).count() == 0:
            db.add_all(
                models.TeethData(teeth=t, paper_size=p) for t, p in TEETH_DATA
            )
            print(f"Seeded {len(TEETH_DATA)} teeth rows.")
        else:
            print("Teeth data already present, skipping.")

        if db.query(models.Substrate).count() == 0:
            db.add_all(
                models.Substrate(name=n, price=p) for n, p in SUBSTRATES
            )
            print(f"Seeded {len(SUBSTRATES)} substrates.")
        else:
            print("Substrates already present, skipping.")

        db.commit()
        print("Seeding complete.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
