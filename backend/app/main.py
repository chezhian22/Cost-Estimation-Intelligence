"""FastAPI application — Cylinder Cost Estimation System (Chroma Print India)."""

from typing import List

import os

import base64

from fastapi import Depends, FastAPI, File, HTTPException, Request, Response, Security, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from . import calculator, crud, models, schemas
from .auth import create_access_token, decode_token
from .database import Base, engine, get_db
from .security import check_request_body

bearer_scheme = HTTPBearer(auto_error=False)


def _extract_token(request: Request, credentials: HTTPAuthorizationCredentials | None) -> str | None:
    """Cookie takes priority; Bearer header is accepted as fallback (API clients / tests)."""
    return request.cookies.get("cp_token") or (credentials.credentials if credentials else None)


def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Security(bearer_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    token = _extract_token(request, credentials)
    payload = decode_token(token) if token else None
    if not payload:
        raise HTTPException(status_code=401, detail="Not authenticated")
    user = crud.get_user(db, int(payload["sub"]))
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User inactive or not found")
    return user


def require_admin(current_user: models.User = Depends(get_current_user)) -> models.User:
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user


def get_optional_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials = Security(bearer_scheme),
    db: Session = Depends(get_db),
) -> models.User | None:
    token = _extract_token(request, credentials)
    payload = decode_token(token) if token else None
    if not payload:
        return None
    return crud.get_user(db, int(payload["sub"]))

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
            if "custom_cost" not in existing:
                conn.execute(text(
                    "ALTER TABLE calculations ADD COLUMN custom_cost FLOAT NOT NULL DEFAULT 0"
                ))
            if "selected_teeth" not in existing:
                conn.execute(text(
                    "ALTER TABLE calculations ADD COLUMN selected_teeth INTEGER NULL"
                ))
            if "created_by_id" not in existing:
                conn.execute(text("ALTER TABLE calculations ADD COLUMN created_by_id INTEGER NULL"))
            if "updated_by_id" not in existing:
                conn.execute(text("ALTER TABLE calculations ADD COLUMN updated_by_id INTEGER NULL"))
            if "updated_at" not in existing:
                conn.execute(text("ALTER TABLE calculations ADD COLUMN updated_at DATETIME NULL"))
            if "order_qty" not in existing:
                conn.execute(text("ALTER TABLE calculations ADD COLUMN order_qty INTEGER NULL"))

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

        # company_settings — add missing columns if table was created before this migration
        if "company_settings" in tables:
            cs_cols = {c["name"] for c in insp.get_columns("company_settings")}
            for col, ddl in [
                ("tagline",    "VARCHAR(200) NULL"),
                ("address",    "VARCHAR(300) NULL"),
                ("state",      "VARCHAR(100) NULL"),
                ("website",    "VARCHAR(200) NULL"),
                ("gst_number", "VARCHAR(50)  NULL"),
                ("updated_at", "DATETIME NULL"),
                ("cgst_pct",   "FLOAT NULL"),
                ("sgst_pct",   "FLOAT NULL"),
                ("logo",       "MEDIUMTEXT NULL"),
            ]:
                if col not in cs_cols:
                    conn.execute(text(f"ALTER TABLE company_settings ADD COLUMN {col} {ddl}"))

            # Upgrade logo from TEXT → MEDIUMTEXT if it was created by an older deploy
            if "logo" in cs_cols:
                try:
                    conn.execute(text(
                        "ALTER TABLE company_settings MODIFY COLUMN logo MEDIUMTEXT NULL"
                    ))
                except Exception:
                    pass  # SQLite or already MEDIUMTEXT — safe to ignore

_migrate()

# Validate that the live DB schema matches the models before accepting requests.
from .schema_validator import validate_db_schema  # noqa: E402
validate_db_schema(engine, Base)

# Seed default admin user (runs only if no users exist)
from .database import SessionLocal as _SL  # noqa: E402
_db = _SL()
try:
    crud.seed_admin(_db)
finally:
    _db.close()

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

_ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")
    if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── SQL injection guard ───────────────────────────────────────────────────────
@app.middleware("http")
async def sql_injection_guard(request: Request, call_next):
    """
    Scan every mutating request body for SQL injection patterns before any
    route handler or DB layer is reached.

    The ORM already parameterises all queries (making DB-level injection
    impossible), but this middleware adds a visible second layer that:
      • Rejects the request immediately with 400 if a pattern is found.
      • Logs the client IP, path, and matched patterns for audit purposes.
    """
    if request.method in ("POST", "PUT", "PATCH"):
        content_type = request.headers.get("content-type", "")
        # Skip body scan for file uploads — multipart data is binary and reading
        # the body here breaks Starlette's multipart parser in the route handler.
        if "multipart/form-data" not in content_type:
            raw = await request.body()
            client_ip = request.client.host if request.client else "unknown"
            findings = check_request_body(raw, client_ip, request.url.path)
            if findings:
                patterns = list({p for _, p in findings})
                return JSONResponse(
                    status_code=400,
                    content={
                        "detail": "Request rejected: input contains disallowed SQL patterns.",
                        "patterns": patterns,
                    },
                )
    return await call_next(request)


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


@app.patch(
    "/api/orders/{order_id}",
    tags=["orders"],
    response_model=schemas.OrderOut,
    summary="Rename an order",
)
def update_order(order_id: int, data: schemas.OrderCreate, db: Session = Depends(get_db)):
    obj = crud.update_order(db, order_id, data.name)
    if obj is None:
        raise HTTPException(status_code=404, detail="Order not found")
    return obj


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
    existing = db.query(models.Substrate).filter(models.Substrate.name == data.name.strip()).first()
    if existing:
        raise HTTPException(status_code=409, detail="Substrate name already exists")
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
    "/api/substrates/{substrate_id}",
    tags=["substrates"],
    summary="Update substrate name / price",
    response_model=schemas.SubstrateOut,
)
def update_substrate(
    substrate_id: int,
    body: schemas.SubstrateUpdate,
    db: Session = Depends(get_db),
):
    obj = crud.update_substrate(db, substrate_id, body)
    if obj is None:
        raise HTTPException(status_code=404, detail="Substrate not found")
    return obj


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
    existing = db.query(models.TeethData).filter(models.TeethData.teeth == data.teeth).first()
    if existing:
        raise HTTPException(status_code=409, detail="A cylinder with this teeth count already exists")
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
    "/api/teeth/{teeth_id}",
    tags=["cylinders"],
    summary="Update cylinder teeth / paper size",
    response_model=schemas.TeethOut,
)
def update_teeth(
    teeth_id: int,
    body: schemas.TeethUpdate,
    db: Session = Depends(get_db),
):
    obj = crud.update_teeth(db, teeth_id, body)
    if obj is None:
        raise HTTPException(status_code=404, detail="Cylinder not found")
    return obj


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
def run_calculation(
    req: schemas.CalculationRequest,
    db: Session = Depends(get_db),
    current_user: models.User | None = Depends(get_optional_user),
):
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
    teeth_rows = crud.list_teeth(db, available_only=True)
    if not teeth_rows:
        raise HTTPException(
            status_code=400,
            detail="No available cylinders found. Check Cylinder Management.",
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
        custom_cost=req.custom_cost,
    )

    calculation_id = None
    if req.save:
        uid = current_user.id if current_user else None
        saved = crud.save_calculation(db, req, result, user_id=uid)
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
        created_by_name = c.created_by.username if c.created_by else None
        updated_by_name = c.updated_by.username if c.updated_by else None
        out.append(schemas.CalculationHistoryOut(
            id=c.id,
            width=c.width,
            height=c.height,
            yield_pct=c.yield_pct,
            substrate_name=c.substrate_name,
            substrate_price=c.substrate_price,
            foil_cost=c.foil_cost,
            custom_cost=c.custom_cost if c.custom_cost is not None else 0,
            selected_teeth=c.selected_teeth,
            exchange_rate=c.exchange_rate,
            order_qty=c.order_qty,
            created_at=c.created_at,
            client_id=c.client_id,
            order_id=c.order_id,
            client_name=client_name,
            order_name=order_name,
            status=c.status or "pending",
            pricing=c.result.get("pricing") if c.result else None,
            created_by_name=created_by_name,
            updated_by_name=updated_by_name,
            updated_at=c.updated_at,
        ))
    return out


@app.patch(
    "/api/calculations/{calc_id}/cylinder",
    tags=["history"],
    summary="Update selected cylinder",
)
def update_cylinder(
    calc_id: int,
    body: schemas.CylinderUpdate,
    db: Session = Depends(get_db),
    current_user: models.User | None = Depends(get_optional_user),
):
    uid = current_user.id if current_user else None
    obj = crud.update_selected_cylinder(db, calc_id, body.selected_teeth, user_id=uid)
    if obj is None:
        raise HTTPException(status_code=404, detail="Calculation not found")
    return {"id": obj.id, "selected_teeth": obj.selected_teeth}


@app.patch(
    "/api/calculations/{calc_id}/status",
    tags=["history"],
    summary="Update quote status",
    response_description="The updated calculation record with the new status.",
)
def update_status(
    calc_id: int,
    body: schemas.StatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User | None = Depends(get_optional_user),
):
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
    uid = current_user.id if current_user else None
    obj = crud.update_calculation_status(db, calc_id, body.status, user_id=uid)
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
    client = crud.get_client(db, obj.client_id) if obj.client_id else None
    order  = crud.get_order(db, obj.order_id)   if obj.order_id  else None
    return {
        "id": obj.id,
        "width": obj.width,
        "height": obj.height,
        "yield_pct": obj.yield_pct,
        "substrate_name": obj.substrate_name,
        "substrate_price": obj.substrate_price,
        "foil_cost": obj.foil_cost,
        "exchange_rate": obj.exchange_rate,
        "order_qty": obj.order_qty,
        "created_at": obj.created_at,
        "client_id": obj.client_id,
        "order_id": obj.order_id,
        "client_name":     client.name     if client else None,
        "client_location": client.location if client else None,
        "client_email":    client.email    if client else None,
        "client_phone":    client.phone    if client else None,
        "order_name":  order.name  if order  else None,
        "status": obj.status or "pending",
        "result": obj.result,
    }


# ── Calculation versions ──────────────────────────────────────────────────────
@app.get(
    "/api/calculations/{calc_id}/versions",
    tags=["history"],
    summary="List edit versions for a calculation",
)
def list_versions(calc_id: int, db: Session = Depends(get_db)):
    obj = crud.get_calculation(db, calc_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="Calculation not found")
    versions = crud.list_versions(db, calc_id)
    return [
        {
            "id": v.id,
            "calculation_id": v.calculation_id,
            "version_number": v.version_number,
            "width": v.width,
            "height": v.height,
            "yield_pct": v.yield_pct,
            "substrate_name": v.substrate_name,
            "substrate_price": v.substrate_price,
            "foil_cost": v.foil_cost,
            "custom_cost": v.custom_cost,
            "selected_teeth": v.selected_teeth,
            "exchange_rate": v.exchange_rate,
            "status": v.status,
            "created_by_name": v.created_by.username if v.created_by else None,
            "created_at": v.created_at,
            "result": v.result,
        }
        for v in versions
    ]


@app.post(
    "/api/calculations/{calc_id}/versions",
    tags=["history"],
    summary="Save an edited version of a calculation",
)
def create_version(
    calc_id: int,
    req: schemas.CalculationRequest,
    db: Session = Depends(get_db),
    current_user: models.User | None = Depends(get_optional_user),
):
    obj = crud.get_calculation(db, calc_id)
    if obj is None:
        raise HTTPException(status_code=404, detail="Calculation not found")
    teeth_rows = crud.list_teeth(db, available_only=True)
    if not teeth_rows:
        raise HTTPException(status_code=400, detail="No available cylinders found.")
    teeth_data = [{"teeth": t.teeth, "paper_size": t.paper_size} for t in teeth_rows]
    result = calculator.calculate(
        width=req.width,
        height=req.height,
        yield_pct=req.yield_pct,
        substrate_price=req.substrate_price,
        foil_cost=req.foil_cost,
        exchange_rate=req.exchange_rate,
        teeth_data=teeth_data,
        custom_cost=req.custom_cost,
    )
    uid = current_user.id if current_user else None
    version = crud.create_version(db, calc_id, req, result, uid)
    return {**result, "version_id": version.id, "version_number": version.version_number, "calculation_id": calc_id}


@app.patch(
    "/api/calculations/versions/{version_id}/status",
    tags=["history"],
    summary="Update the status of a calculation version",
)
def update_version_status(
    version_id: int,
    body: schemas.StatusUpdate,
    db: Session = Depends(get_db),
):
    version = crud.update_version_status(db, version_id, body.status)
    if version is None:
        raise HTTPException(status_code=404, detail="Version not found")
    return {
        "id": version.id,
        "calculation_id": version.calculation_id,
        "version_number": version.version_number,
        "status": version.status,
    }


# ── Auth ──────────────────────────────────────────────────────────────────────
_COOKIE_NAME     = "cp_token"
_SECURE_COOKIE   = os.getenv("ENVIRONMENT", "development") == "production"
_COOKIE_MAX_AGE  = 8 * 3600   # matches TOKEN_EXPIRE_HOURS in auth.py


@app.post("/api/auth/login", response_model=schemas.LoginResponse, tags=["auth"])
def login(body: schemas.LoginRequest, response: Response, db: Session = Depends(get_db)):
    """Authenticate with email + password. Sets an HttpOnly cookie carrying the JWT."""
    from .auth import verify_password  # noqa: PLC0415

    user = crud.get_user_by_email(db, body.email.strip().lower())
    # Verify password before revealing anything about account status (prevents email enumeration)
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Your account has been deactivated. Contact your administrator.")
    token = create_access_token(user.id, user.username, user.role)
    response.set_cookie(
        key=_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=_SECURE_COOKIE,
        samesite="lax",
        max_age=_COOKIE_MAX_AGE,
        path="/",
    )
    return schemas.LoginResponse(user=schemas.UserOut.model_validate(user))


@app.post("/api/auth/logout", status_code=200, tags=["auth"])
def logout(response: Response):
    """Clear the session cookie."""
    response.delete_cookie(key=_COOKIE_NAME, path="/")
    return {"status": "ok"}


@app.get("/api/auth/me", response_model=schemas.UserOut, tags=["auth"])
def get_me(current_user: models.User = Depends(get_current_user)):
    """Returns the currently authenticated user's profile."""
    return current_user


# ── User Management (admin only) ──────────────────────────────────────────────
@app.get("/api/users", response_model=List[schemas.UserOut], tags=["users"])
def list_users(_: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    """List all users. Admin only."""
    return crud.list_users(db)


@app.post("/api/users", response_model=schemas.UserOut, status_code=201, tags=["users"])
def create_user(
    data: schemas.UserCreate,
    _: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Create a new user. Admin only."""
    if crud.get_user_by_email(db, data.email.strip().lower()):
        raise HTTPException(status_code=409, detail="Email already in use")
    if crud.get_user_by_username(db, data.username.strip()):
        raise HTTPException(status_code=409, detail="Username already in use")
    return crud.create_user(db, data)


@app.patch("/api/users/{user_id}", response_model=schemas.UserOut, tags=["users"])
def update_user(
    user_id: int,
    data: schemas.UserUpdate,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Update a user's details. Admin only."""
    if data.email:
        existing = crud.get_user_by_email(db, data.email.strip().lower())
        if existing and existing.id != user_id:
            raise HTTPException(status_code=409, detail="Email already in use")
    obj = crud.update_user(db, user_id, data)
    if obj is None:
        raise HTTPException(status_code=404, detail="User not found")
    return obj


@app.delete("/api/users/{user_id}", status_code=204, tags=["users"])
def delete_user(
    user_id: int,
    current_user: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Delete a user. Admin only. Cannot delete yourself."""
    if user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    if not crud.delete_user(db, user_id):
        raise HTTPException(status_code=404, detail="User not found")


# ── Company Settings (admin only) ─────────────────────────────────────────────
@app.get(
    "/api/settings/company",
    response_model=schemas.CompanySettingsOut,
    tags=["settings"],
    summary="Get company settings",
)
def get_company_settings(
    _: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Returns the current company profile. Admin only."""
    return crud.get_company_settings(db)


@app.patch(
    "/api/settings/company",
    response_model=schemas.CompanySettingsOut,
    tags=["settings"],
    summary="Update company settings",
)
def update_company_settings(
    body: schemas.CompanySettingsUpdate,
    _: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Update company profile fields. Admin only. Partial updates supported."""
    return crud.upsert_company_settings(db, body)


_LOGO_MAX_BYTES = 2 * 1024 * 1024  # 2 MB
_LOGO_ALLOWED_TYPES = {"image/png", "image/jpeg", "image/svg+xml", "image/webp", "image/gif"}


@app.post(
    "/api/settings/company/logo",
    response_model=schemas.CompanySettingsOut,
    tags=["settings"],
    summary="Upload company logo",
)
async def upload_company_logo(
    file: UploadFile = File(...),
    _: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Upload a company logo image. Max 2 MB. Admin only."""
    content_type = file.content_type or ""
    if content_type not in _LOGO_ALLOWED_TYPES:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{content_type}'. Allowed: PNG, JPEG, SVG, WebP, GIF.",
        )
    data = await file.read()
    if len(data) > _LOGO_MAX_BYTES:
        raise HTTPException(status_code=413, detail="Logo file exceeds the 2 MB limit.")
    b64 = base64.b64encode(data).decode("ascii")
    data_url = f"data:{content_type};base64,{b64}"
    return crud.update_company_logo(db, data_url)


@app.delete(
    "/api/settings/company/logo",
    response_model=schemas.CompanySettingsOut,
    tags=["settings"],
    summary="Remove company logo",
)
def delete_company_logo(
    _: models.User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Remove the stored company logo. Admin only."""
    return crud.update_company_logo(db, None)
