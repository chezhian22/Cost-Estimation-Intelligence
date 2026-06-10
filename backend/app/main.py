"""FastAPI application — Cylinder Cost Estimation System (Chroma Print India)."""

from typing import List

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from . import calculator, crud, models, schemas
from .database import Base, engine, get_db

# ── DB bootstrap ──────────────────────────────────────────────────────────────
Base.metadata.create_all(bind=engine)

def _migrate():
    """Safe column additions run on every startup."""
    insp = inspect(engine)
    tables = insp.get_table_names()

    with engine.begin() as conn:
        # clients table — extended profile fields
        if "clients" in tables:
            cli_cols = {c["name"] for c in insp.get_columns("clients")}
            for col, ddl in [
                ("location", "VARCHAR(200) NULL"),
                ("industry", "VARCHAR(120) NULL"),
                ("email",    "VARCHAR(200) NULL"),
                ("phone",    "VARCHAR(30)  NULL"),
            ]:
                if col not in cli_cols:
                    conn.execute(text(f"ALTER TABLE clients ADD COLUMN {col} {ddl}"))

        # calculations table
        if "calculations" in tables:
            existing = {c["name"] for c in insp.get_columns("calculations")}
            if "client_id" not in existing:
                conn.execute(text("ALTER TABLE calculations ADD COLUMN client_id INT NULL"))
            if "order_id" not in existing:
                conn.execute(text("ALTER TABLE calculations ADD COLUMN order_id INT NULL"))
            if "status" not in existing:
                conn.execute(text(
                    "ALTER TABLE calculations ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'pending'"
                ))

        # orders table — order_date
        if "orders" in tables:
            ord_cols = {c["name"] for c in insp.get_columns("orders")}
            if "order_date" not in ord_cols:
                conn.execute(text("ALTER TABLE orders ADD COLUMN order_date DATE NULL"))

        # substrates table — availability flag
        if "substrates" in tables:
            sub_cols = {c["name"] for c in insp.get_columns("substrates")}
            if "available" not in sub_cols:
                conn.execute(text(
                    "ALTER TABLE substrates ADD COLUMN available INTEGER NOT NULL DEFAULT 1"
                ))

        # teeth_data table — availability flag
        if "teeth_data" in tables:
            teeth_cols = {c["name"] for c in insp.get_columns("teeth_data")}
            if "available" not in teeth_cols:
                conn.execute(text(
                    "ALTER TABLE teeth_data ADD COLUMN available INTEGER NOT NULL DEFAULT 1"
                ))

_migrate()

# ── Tag metadata (shown as section headers in Swagger) ────────────────────────
TAGS = [
    {
        "name": "health",
        "description": "Service liveness check.",
    },
    {
        "name": "clients",
        "description": (
            "Clients are the top-level entity (e.g. a brand or company). "
            "Each client owns one or more **orders**."
        ),
    },
    {
        "name": "orders",
        "description": (
            "An order belongs to a client and groups related calculations together. "
            "Create an order first, then pass its `id` as `order_id` in `POST /api/calculate` "
            "with `save: true` to associate results with it."
        ),
    },
    {
        "name": "substrates",
        "description": (
            "Reference list of printable materials and their per-m² cost. "
            "Populate this list from the Admin UI or directly via the API before running calculations."
        ),
    },
    {
        "name": "cylinders",
        "description": (
            "Reference table of cylinder specifications (teeth count → paper width). "
            "The calculator iterates over every row in this table to find the best-fit cylinder. "
            "At least one row must exist before calling `POST /api/calculate`."
        ),
    },
    {
        "name": "calculate",
        "description": (
            "Core estimation endpoint. "
            "Returns a full comparison table across all cylinders plus a pricing summary "
            "for the best-matched cylinder. "
            "\n\n**Typical frontend flow:**\n"
            "1. `GET /api/substrates` → populate substrate dropdown\n"
            "2. User fills in label dimensions, waste %, substrate, foil cost, exchange rate\n"
            "3. `POST /api/calculate` with `save: false` for a live preview\n"
            "4. If user wants to save: select client + order, re-submit with `save: true`"
        ),
    },
    {
        "name": "history",
        "description": (
            "Saved calculation records. Only calculations submitted with `save: true` appear here. "
            "Records are linked to a client and order when those IDs were supplied."
        ),
    },
]

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Cylinder Calculator API",
    version="1.0.0",
    description="""
## Cylinder Cost Estimation — REST API

Built for **Chroma Print India Pvt Ltd**.
Powers the *igence* label-estimator frontend.

---

### How the calculator works

1. The frontend sends label **width × height** (mm), a **waste %**, and material costs.
2. The API iterates over every cylinder in the `teeth_data` reference table.
3. For each cylinder it computes how many labels fit around & across the web.
4. The **best match** is the cylinder that maximises adjusted labels/m².
5. Pricing is returned in **INR** and **USD** at three rate tiers (1:1.5 / 1:1.75 / 1:2).

### Key formula

```
circumference   = teeth × 3.175  (mm)
adj_labels/m²   = raw_labels × (yield_pct / 100)   ← higher yield = more labels = lower cost
price_inr_1000  = (substrate_price + foil_cost) / adj_labels × 1000
price_usd_1000  = price_inr_1000 / exchange_rate
```

### Before first use
Run the seed script to load reference cylinders and substrate presets:
```bash
python -m app.seed
```
""",
    openapi_tags=TAGS,
    contact={
        "name": "Chroma Print India — Dev Team",
    },
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Health ────────────────────────────────────────────────────────────────────
@app.get(
    "/api/health",
    tags=["health"],
    summary="Health check",
    response_description="Returns `{status: ok}` when the service is running.",
)
def health():
    """Liveness probe. No authentication required."""
    return {"status": "ok"}


# ── Clients ───────────────────────────────────────────────────────────────────
@app.get(
    "/api/clients",
    tags=["clients"],
    summary="List all clients",
    response_model=List[schemas.ClientOut],
    response_description="Alphabetically sorted list of all clients.",
)
def get_clients(db: Session = Depends(get_db)):
    """
    Returns every client in the database, sorted A→Z by name.

    **Use this to populate the client dropdown** in the calculator sidebar.
    """
    return crud.list_clients(db)


@app.post(
    "/api/clients",
    tags=["clients"],
    summary="Create a client",
    response_model=schemas.ClientOut,
    status_code=201,
    response_description="The newly created client record.",
)
def add_client(data: schemas.ClientCreate, db: Session = Depends(get_db)):
    """
    Creates a new client with the given name.

    - Name must be **unique** (case-sensitive). Returns `409` if it already exists.
    - After creation, use the returned `id` to create orders under this client.
    """
    existing = crud.get_client_by_name(db, data.name.strip())
    if existing:
        raise HTTPException(status_code=409, detail="Client name already exists")
    return crud.create_client(db, data)


@app.patch(
    "/api/clients/{client_id}",
    tags=["clients"],
    summary="Update a client",
    response_model=schemas.ClientOut,
)
def update_client(client_id: int, data: schemas.ClientUpdate, db: Session = Depends(get_db)):
    """Rename a client. Returns 404 if not found, 409 if the new name is already taken."""
    if not crud.get_client(db, client_id):
        raise HTTPException(status_code=404, detail="Client not found")
    existing = crud.get_client_by_name(db, data.name.strip())
    if existing and existing.id != client_id:
        raise HTTPException(status_code=409, detail="Client name already exists")
    obj = crud.update_client(db, client_id, data)
    return obj


# ── Orders ────────────────────────────────────────────────────────────────────
@app.get(
    "/api/clients/{client_id}/orders",
    tags=["orders"],
    summary="List orders for a client",
    response_model=List[schemas.OrderOut],
    response_description="Orders for the specified client, newest first.",
)
def get_orders(client_id: int, db: Session = Depends(get_db)):
    """
    Returns all orders belonging to `client_id`, sorted newest-first.

    **Use this to populate the order dropdown** after the user selects a client.
    Returns `404` if the client does not exist.
    """
    if not crud.get_client(db, client_id):
        raise HTTPException(status_code=404, detail="Client not found")
    return crud.list_orders(db, client_id)


@app.post(
    "/api/clients/{client_id}/orders",
    tags=["orders"],
    summary="Create an order",
    response_model=schemas.OrderOut,
    status_code=201,
    response_description="The newly created order.",
)
def add_order(client_id: int, data: schemas.OrderCreate, db: Session = Depends(get_db)):
    """
    Creates a new order under the specified client.

    The frontend auto-generates the name as `Order #N` (where N = existing order count + 1),
    so no user input is required.
    Returns `404` if the client does not exist.
    """
    if not crud.get_client(db, client_id):
        raise HTTPException(status_code=404, detail="Client not found")
    return crud.create_order(db, client_id, data)


@app.get(
    "/api/orders/{order_id}/calculations",
    tags=["orders"],
    summary="Get calculations under an order",
    response_description="List of saved calculations with their pricing summaries.",
)
def get_order_calculations(order_id: int, db: Session = Depends(get_db)):
    """
    Returns all calculations that were saved with this `order_id`, newest first.

    Each item contains the input parameters **and** the `pricing` object so the
    frontend can display a summary table without a second request.

    Returns `404` if the order does not exist.
    """
    order = crud.get_order(db, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    calcs = crud.list_order_calculations(db, order_id)
    return [
        {
            "id": c.id,
            "width": c.width,
            "height": c.height,
            "yield_pct": c.yield_pct,
            "substrate_name": c.substrate_name,
            "substrate_price": c.substrate_price,
            "foil_cost": c.foil_cost,
            "exchange_rate": c.exchange_rate,
            "created_at": c.created_at,
            "status": c.status or "pending",
            "pricing": c.result.get("pricing") if c.result else None,
        }
        for c in calcs
    ]


# ── Substrates ───────────────────────────────────────────────────────────────
@app.get(
    "/api/substrates",
    tags=["substrates"],
    summary="List all substrates",
    response_model=List[schemas.SubstrateOut],
    response_description="All substrate materials sorted by insertion order.",
)
def get_substrates(db: Session = Depends(get_db)):
    """
    Returns every substrate in the database.

    **Use this to populate the substrate dropdown** in the calculator.
    The `price` field (₹/m²) is used directly in cost calculations.
    """
    return crud.list_substrates(db)


@app.post(
    "/api/substrates",
    tags=["substrates"],
    summary="Add a substrate",
    response_model=schemas.SubstrateOut,
    status_code=201,
    response_description="The newly created substrate.",
)
def add_substrate(data: schemas.SubstrateCreate, db: Session = Depends(get_db)):
    """
    Adds a new substrate material to the reference list.

    - `name` should be descriptive (e.g. `"PP Gloss"`, `"PET Silver Metalized"`).
    - `price` is in **₹ per m²**.
    """
    return crud.create_substrate(db, data)


@app.delete(
    "/api/substrates/{substrate_id}",
    tags=["substrates"],
    summary="Delete a substrate",
    status_code=204,
    response_description="No content — substrate deleted successfully.",
)
def remove_substrate(substrate_id: int, db: Session = Depends(get_db)):
    """
    Permanently deletes a substrate by its `id`.

    Returns `404` if not found.
    **Note:** deleting a substrate does not affect historical calculations that
    referenced it — the name is stored as a plain string in each calculation record.
    """
    if not crud.delete_substrate(db, substrate_id):
        raise HTTPException(status_code=404, detail="Substrate not found")


@app.patch(
    "/api/substrates/{substrate_id}/availability",
    tags=["substrates"],
    summary="Update substrate availability",
    response_model=schemas.SubstrateOut,
)
def set_substrate_availability(
    substrate_id: int,
    body: schemas.AvailabilityUpdate,
    db: Session = Depends(get_db),
):
    obj = crud.set_substrate_availability(db, substrate_id, body.available)
    if obj is None:
        raise HTTPException(status_code=404, detail="Substrate not found")
    return obj


# ── Cylinders (Teeth) ─────────────────────────────────────────────────────────
@app.get(
    "/api/teeth",
    tags=["cylinders"],
    summary="List all cylinders",
    response_model=List[schemas.TeethOut],
    response_description="All cylinder reference rows sorted by teeth count (ascending).",
)
def get_teeth(db: Session = Depends(get_db)):
    """
    Returns the full cylinder reference table, sorted by teeth count.

    Each row defines one physical cylinder:
    - `teeth` — gear tooth count, determines circumference (`teeth × 3.175 mm`)
    - `paper_size` — the usable web/paper width in mm for this cylinder
    """
    return crud.list_teeth(db)


@app.post(
    "/api/teeth",
    tags=["cylinders"],
    summary="Add a cylinder",
    response_model=schemas.TeethOut,
    status_code=201,
    response_description="The newly created cylinder row.",
)
def add_teeth(data: schemas.TeethCreate, db: Session = Depends(get_db)):
    """
    Adds a new cylinder to the reference table.

    - `teeth` must be unique (each physical cylinder has a distinct tooth count).
    - `paper_size` is the web width in mm that this cylinder accommodates.

    The new cylinder is immediately available for future `POST /api/calculate` calls.
    """
    return crud.create_teeth(db, data)


@app.delete(
    "/api/teeth/{teeth_id}",
    tags=["cylinders"],
    summary="Delete a cylinder",
    status_code=204,
    response_description="No content — cylinder deleted successfully.",
)
def remove_teeth(teeth_id: int, db: Session = Depends(get_db)):
    """
    Permanently removes a cylinder from the reference table.

    Returns `404` if not found.
    **Warning:** removing a cylinder changes the results of future calculations.
    """
    if not crud.delete_teeth(db, teeth_id):
        raise HTTPException(status_code=404, detail="Cylinder not found")


@app.patch(
    "/api/teeth/{teeth_id}/availability",
    tags=["cylinders"],
    summary="Update cylinder availability",
    response_model=schemas.TeethOut,
)
def set_teeth_availability(
    teeth_id: int,
    body: schemas.AvailabilityUpdate,
    db: Session = Depends(get_db),
):
    obj = crud.set_teeth_availability(db, teeth_id, body.available)
    if obj is None:
        raise HTTPException(status_code=404, detail="Cylinder not found")
    return obj


# ── Calculate ────────────────────────────────────────────────────────────────
@app.post(
    "/api/calculate",
    tags=["calculate"],
    summary="Run a cylinder cost calculation",
    response_model=schemas.CalculationResponse,
    response_description=(
        "Full table of cylinder rows, the best-match details, "
        "and the pricing summary for the recommended cylinder."
    ),
)
def run_calculation(req: schemas.CalculationRequest, db: Session = Depends(get_db)):
    """
    **Main estimation endpoint.**

    Iterates over every cylinder in the reference table, computes packing and
    pricing for each, and returns the full comparison table plus the recommended
    (best-fit) cylinder.

    ### Request fields
    | Field | Required | Notes |
    |---|---|---|
    | `width` | yes | Label width in mm |
    | `height` | yes | Label height in mm |
    | `yield_pct` | yes | Effective web utilisation % (e.g. `85`) |
    | `substrate_price` | yes | ₹ per m² |
    | `foil_cost` | no | Extra ₹ per m², default `0` |
    | `exchange_rate` | yes | ₹ per USD, e.g. `85` |
    | `save` | no | Set `true` to persist the result |
    | `client_id` / `order_id` | no | Required only when `save: true` |

    ### Response highlights
    - `rows` — one entry per cylinder in the reference table
    - `matched` — points to the best-fit row by index and teeth count
    - `pricing` — cost summary (INR + USD) for the matched cylinder
    - `calculation_id` — non-null only when `save: true` was sent

    Returns `400` if the cylinder reference table is empty (run the seed script).
    """
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
        yield_pct=req.yield_pct,
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
@app.get(
    "/api/calculations",
    tags=["history"],
    summary="List saved calculations",
    response_model=List[schemas.CalculationHistoryOut],
    response_description="Up to 50 most recent saved calculations, newest first.",
)
def get_calculations(db: Session = Depends(get_db)):
    """
    Returns the 50 most recent saved calculations across **all** clients and orders.

    Each record includes denormalised `client_name` and `order_name` fields so
    the frontend can display them without extra lookups.

    Only calculations submitted with `save: true` appear here.
    """
    calcs = crud.list_calculations(db)
    out = []
    for c in calcs:
        client_name = None
        order_name  = None
        if c.client_id:
            client = crud.get_client(db, c.client_id)
            client_name = client.name if client else None
        if c.order_id:
            order = crud.get_order(db, c.order_id)
            order_name = order.name if order else None
        out.append(schemas.CalculationHistoryOut(
            id=c.id,
            width=c.width,
            height=c.height,
            yield_pct=c.yield_pct,
            substrate_name=c.substrate_name,
            substrate_price=c.substrate_price,
            foil_cost=c.foil_cost,
            exchange_rate=c.exchange_rate,
            created_at=c.created_at,
            client_id=c.client_id,
            order_id=c.order_id,
            client_name=client_name,
            order_name=order_name,
            status=c.status or "pending",
            pricing=c.result.get("pricing") if c.result else None,
        ))
    return out


@app.patch(
    "/api/calculations/{calc_id}/status",
    tags=["history"],
    summary="Update quote status",
    response_description="The updated calculation record with the new status.",
)
def update_status(calc_id: int, body: schemas.StatusUpdate, db: Session = Depends(get_db)):
    """
    Changes the status of a saved quote.

    Valid values for `status`:
    - `pending` — not yet decided (default)
    - `confirmed` — quote accepted and order confirmed
    - `rejected` — quote not accepted

    Returns `404` if the calculation does not exist.
    Returns `400` if an invalid status value is supplied.
    """
    valid = {"pending", "confirmed", "rejected"}
    if body.status not in valid:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status '{body.status}'. Must be one of: {', '.join(sorted(valid))}",
        )
    obj = crud.update_calculation_status(db, calc_id, body.status)
    if obj is None:
        raise HTTPException(status_code=404, detail="Calculation not found")
    return {"id": obj.id, "status": obj.status}


@app.get(
    "/api/calculations/{calc_id}",
    tags=["history"],
    summary="Get a single saved calculation",
    response_description="Full calculation record including the complete result JSON.",
)
def get_calculation(calc_id: int, db: Session = Depends(get_db)):
    """
    Returns the full record for one saved calculation, including the complete
    `result` JSON (all cylinder rows + matched + pricing).

    Use this when the frontend needs to **replay or display** a historical result
    in detail.  Returns `404` if not found.
    """
    obj = crud.get_calculation(db, calc_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="Calculation not found")
    return {
        "id": obj.id,
        "width": obj.width,
        "height": obj.height,
        "yield_pct": obj.yield_pct,
        "substrate_name": obj.substrate_name,
        "substrate_price": obj.substrate_price,
        "foil_cost": obj.foil_cost,
        "exchange_rate": obj.exchange_rate,
        "created_at": obj.created_at,
        "client_id": obj.client_id,
        "order_id": obj.order_id,
        "status": obj.status or "pending",
        "result": obj.result,
    }
