"""
FastAPI application for the Cylinder Calculator.

Routes
------
GET  /api/health                 health check
GET  /api/substrates             list substrates
POST /api/substrates             add a substrate
GET  /api/teeth                  list teeth/paper reference rows
POST /api/teeth                  add a teeth/paper row
POST /api/calculate              run a calculation (optionally save it)
GET  /api/calculations           list saved calculations (history)
GET  /api/calculations/{id}      fetch one saved calculation (full result)
"""

from typing import List

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from . import calculator, crud, models, schemas
from .database import Base, engine, get_db

# Create tables on startup (safe to run repeatedly).
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Cylinder Calculator API", version="1.0.0")

# Allow the React dev server (and any origin in dev). Tighten in production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok"}


# ── Substrates ───────────────────────────────────────────────────────────────
@app.get("/api/substrates", response_model=List[schemas.SubstrateOut])
def get_substrates(db: Session = Depends(get_db)):
    return crud.list_substrates(db)


@app.post("/api/substrates", response_model=schemas.SubstrateOut, status_code=201)
def add_substrate(data: schemas.SubstrateCreate, db: Session = Depends(get_db)):
    return crud.create_substrate(db, data)


# ── Teeth ────────────────────────────────────────────────────────────────────
@app.get("/api/teeth", response_model=List[schemas.TeethOut])
def get_teeth(db: Session = Depends(get_db)):
    return crud.list_teeth(db)


@app.post("/api/teeth", response_model=schemas.TeethOut, status_code=201)
def add_teeth(data: schemas.TeethCreate, db: Session = Depends(get_db)):
    return crud.create_teeth(db, data)


# ── Calculate ────────────────────────────────────────────────────────────────
@app.post("/api/calculate", response_model=schemas.CalculationResponse)
def run_calculation(req: schemas.CalculationRequest, db: Session = Depends(get_db)):
    teeth_rows = crud.list_teeth(db)
    if not teeth_rows:
        raise HTTPException(
            status_code=400,
            detail="No teeth/paper reference data found. Run the seed script first.",
        )

    teeth_data = [{"teeth": t.teeth, "paper_size": t.paper_size} for t in teeth_rows]

    result = calculator.calculate(
        width=req.width,
        height=req.height,
        waste_pct=req.waste_pct,
        substrate_price=req.substrate_price,
        foil_cost=req.foil_cost,
        exchange_rate=req.exchange_rate,
        teeth_data=teeth_data,
    )

    calculation_id = None
    if req.save:
        saved = crud.save_calculation(db, req, result)
        calculation_id = saved.id

    return {**result, "calculation_id": calculation_id}


# ── History ──────────────────────────────────────────────────────────────────
@app.get("/api/calculations", response_model=List[schemas.CalculationHistoryOut])
def get_calculations(db: Session = Depends(get_db)):
    return crud.list_calculations(db)


@app.get("/api/calculations/{calc_id}")
def get_calculation(calc_id: int, db: Session = Depends(get_db)):
    obj = crud.get_calculation(db, calc_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="Calculation not found")
    return {
        "id": obj.id,
        "width": obj.width,
        "height": obj.height,
        "waste_pct": obj.waste_pct,
        "substrate_name": obj.substrate_name,
        "substrate_price": obj.substrate_price,
        "foil_cost": obj.foil_cost,
        "exchange_rate": obj.exchange_rate,
        "created_at": obj.created_at,
        "result": obj.result,
    }
