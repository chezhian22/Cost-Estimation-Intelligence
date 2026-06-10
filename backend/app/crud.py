"""Database CRUD helpers."""

from typing import List, Optional

from sqlalchemy.orm import Session

from . import models, schemas


# ── Clients ──────────────────────────────────────────────────────────────────
def list_clients(db: Session) -> List[models.Client]:
    return db.query(models.Client).order_by(models.Client.name).all()


def get_client(db: Session, client_id: int) -> Optional[models.Client]:
    return db.query(models.Client).filter(models.Client.id == client_id).first()


def get_client_by_name(db: Session, name: str) -> Optional[models.Client]:
    return db.query(models.Client).filter(models.Client.name == name).first()


def update_client(db: Session, client_id: int, name: str) -> Optional[models.Client]:
    obj = db.query(models.Client).filter(models.Client.id == client_id).first()
    if not obj:
        return None
    obj.name = name.strip()
    db.commit()
    db.refresh(obj)
    return obj


def create_client(db: Session, data: schemas.ClientCreate) -> models.Client:
    obj = models.Client(name=data.name.strip())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


# ── Orders ───────────────────────────────────────────────────────────────────
def list_orders(db: Session, client_id: int) -> List[models.Order]:
    return (
        db.query(models.Order)
        .filter(models.Order.client_id == client_id)
        .order_by(models.Order.created_at.desc())
        .all()
    )


def get_order(db: Session, order_id: int) -> Optional[models.Order]:
    return db.query(models.Order).filter(models.Order.id == order_id).first()


def create_order(db: Session, client_id: int, data: schemas.OrderCreate) -> models.Order:
    obj = models.Order(name=data.name.strip(), client_id=client_id, order_date=data.order_date)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


# ── Substrates ───────────────────────────────────────────────────────────────
def list_substrates(db: Session) -> List[models.Substrate]:
    return db.query(models.Substrate).order_by(models.Substrate.id).all()


def create_substrate(db: Session, data: schemas.SubstrateCreate) -> models.Substrate:
    obj = models.Substrate(name=data.name, price=data.price)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


def delete_substrate(db: Session, substrate_id: int) -> bool:
    obj = db.query(models.Substrate).filter(models.Substrate.id == substrate_id).first()
    if not obj:
        return False
    db.delete(obj)
    db.commit()
    return True


def set_substrate_availability(
    db: Session, substrate_id: int, available: bool
) -> Optional[models.Substrate]:
    obj = db.query(models.Substrate).filter(models.Substrate.id == substrate_id).first()
    if not obj:
        return None
    obj.available = available
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


def delete_teeth(db: Session, teeth_id: int) -> bool:
    obj = db.query(models.TeethData).filter(models.TeethData.id == teeth_id).first()
    if not obj:
        return False
    db.delete(obj)
    db.commit()
    return True


def set_teeth_availability(
    db: Session, teeth_id: int, available: bool
) -> Optional[models.TeethData]:
    obj = db.query(models.TeethData).filter(models.TeethData.id == teeth_id).first()
    if not obj:
        return None
    obj.available = available
    db.commit()
    db.refresh(obj)
    return obj


# ── Calculations ─────────────────────────────────────────────────────────────
def save_calculation(
    db: Session, req: schemas.CalculationRequest, result: dict
) -> models.Calculation:
    existing = None
    if req.order_id:
        existing = (
            db.query(models.Calculation)
            .filter(models.Calculation.order_id == req.order_id)
            .first()
        )

    if existing:
        existing.width = req.width
        existing.height = req.height
        existing.yield_pct = req.yield_pct
        existing.substrate_name = req.substrate_name
        existing.substrate_price = req.substrate_price
        existing.foil_cost = req.foil_cost
        existing.exchange_rate = req.exchange_rate
        existing.result = result
        existing.client_id = req.client_id
        db.commit()
        db.refresh(existing)
        return existing

    obj = models.Calculation(
        width=req.width,
        height=req.height,
        yield_pct=req.yield_pct,
        substrate_name=req.substrate_name,
        substrate_price=req.substrate_price,
        foil_cost=req.foil_cost,
        exchange_rate=req.exchange_rate,
        result=result,
        client_id=req.client_id,
        order_id=req.order_id,
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


def list_order_calculations(db: Session, order_id: int) -> List[models.Calculation]:
    return (
        db.query(models.Calculation)
        .filter(models.Calculation.order_id == order_id)
        .order_by(models.Calculation.created_at.desc())
        .all()
    )


def get_calculation(db: Session, calc_id: int) -> Optional[models.Calculation]:
    return db.query(models.Calculation).filter(models.Calculation.id == calc_id).first()


def update_calculation_status(
    db: Session, calc_id: int, status: str
) -> Optional[models.Calculation]:
    obj = db.query(models.Calculation).filter(models.Calculation.id == calc_id).first()
    if not obj:
        return None
    if status == "confirmed" and obj.order_id:
        db.query(models.Calculation).filter(
            models.Calculation.order_id == obj.order_id,
            models.Calculation.id != calc_id,
            models.Calculation.status == "confirmed",
        ).update({"status": "pending"})
    obj.status = status
    db.commit()
    db.refresh(obj)
    return obj
