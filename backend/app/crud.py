"""Database CRUD helpers."""

from typing import List, Optional

from sqlalchemy.orm import Session

from . import models, schemas


# ── Substrates ───────────────────────────────────────────────────────────────
def list_substrates(db: Session) -> List[models.Substrate]:
    return db.query(models.Substrate).order_by(models.Substrate.id).all()


def create_substrate(db: Session, data: schemas.SubstrateCreate) -> models.Substrate:
    obj = models.Substrate(name=data.name, price=data.price)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


# ── Teeth ────────────────────────────────────────────────────────────────────
def list_teeth(db: Session) -> List[models.TeethData]:
    return db.query(models.TeethData).order_by(models.TeethData.teeth).all()


def create_teeth(db: Session, data: schemas.TeethCreate) -> models.TeethData:
    obj = models.TeethData(teeth=data.teeth, paper_size=data.paper_size)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


# ── Calculations ─────────────────────────────────────────────────────────────
def save_calculation(
    db: Session, req: schemas.CalculationRequest, result: dict
) -> models.Calculation:
    obj = models.Calculation(
        width=req.width,
        height=req.height,
        waste_pct=req.waste_pct,
        substrate_name=req.substrate_name,
        substrate_price=req.substrate_price,
        foil_cost=req.foil_cost,
        exchange_rate=req.exchange_rate,
        result=result,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def list_calculations(db: Session, limit: int = 50) -> List[models.Calculation]:
    return (
        db.query(models.Calculation)
        .order_by(models.Calculation.created_at.desc())
        .limit(limit)
        .all()
    )


def get_calculation(db: Session, calc_id: int) -> Optional[models.Calculation]:
    return db.query(models.Calculation).filter(models.Calculation.id == calc_id).first()
