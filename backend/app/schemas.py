"""Pydantic schemas for API request and response bodies."""

from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


# ── Client ────────────────────────────────────────────────────────────────────
class ClientCreate(BaseModel):
    """Body required to create a new client."""

    name: str = Field(
        ...,
        min_length=1,
        max_length=120,
        description="Unique display name for the client (e.g. company or person name).",
        examples=["Kingfisher Breweries"],
    )
    location: Optional[str] = Field(None, max_length=200, description="Office/city location.")
    industry: Optional[str] = Field(None, max_length=120, description="Industry or sector.")
    email:    Optional[str] = Field(None, max_length=200, description="Primary contact email.")
    phone:    Optional[str] = Field(None, max_length=30,  description="Primary contact phone.")

    model_config = {
        "json_schema_extra": {
            "example": {"name": "Kingfisher Breweries", "location": "Bengaluru", "industry": "Beverages", "email": "contact@kingfisher.com", "phone": "+91 98765 43210"}
        }
    }


class ClientOut(BaseModel):
    """Client record returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: int = Field(..., description="Auto-incremented primary key.")
    name: str = Field(..., description="Unique client name.")
    location: Optional[str] = Field(None, description="Office/city location.")
    industry: Optional[str] = Field(None, description="Industry or sector.")
    email: Optional[str] = Field(None, description="Primary contact email.")
    phone: Optional[str] = Field(None, description="Primary contact phone.")
    created_at: datetime = Field(..., description="UTC timestamp when the client was created.")


# ── Order ─────────────────────────────────────────────────────────────────────
class OrderCreate(BaseModel):
    """Body required to create a new order under a client."""

    name: str = Field(
        ...,
        min_length=1,
        max_length=200,
        description="Human-readable order label (e.g. 'Order #1' or 'Jan 2025 Batch').",
        examples=["Order #1"],
    )
    order_date: Optional[date] = Field(None, description="Optional order date (YYYY-MM-DD).")

    model_config = {
        "json_schema_extra": {
            "example": {"name": "Order #1", "order_date": "2025-06-08"}
        }
    }


class OrderOut(BaseModel):
    """Order record returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: int        = Field(..., description="Auto-incremented primary key.")
    name: str      = Field(..., description="Order label.")
    client_id: int = Field(..., description="ID of the parent client.")
    order_date: Optional[date] = Field(None, description="Order date if set.")
    created_at: datetime = Field(..., description="UTC timestamp when the order was created.")


# ── Substrate ────────────────────────────────────────────────────────────────
class SubstrateBase(BaseModel):
    name: str   = Field(..., description="Unique substrate material name (e.g. 'PP Gloss').")
    price: float = Field(..., description="Cost per square metre in INR (₹).")


class SubstrateCreate(SubstrateBase):
    """Body required to create a substrate."""

    model_config = {
        "json_schema_extra": {
            "example": {"name": "PP Gloss", "price": 45.0}
        }
    }


class SubstrateUpdate(BaseModel):
    """Body for updating a substrate (all fields optional)."""
    name:  Optional[str]   = None
    price: Optional[float] = None


class SubstrateOut(SubstrateBase):
    """Substrate record returned by the API."""

    model_config = ConfigDict(from_attributes=True)
    id: int        = Field(..., description="Auto-incremented primary key.")
    available: bool = Field(True, description="Whether this substrate is currently in stock.")


# ── Teeth ────────────────────────────────────────────────────────────────────
class TeethBase(BaseModel):
    teeth: int      = Field(..., description="Number of teeth on the cylinder gear.")
    paper_size: int = Field(..., description="Usable paper/web width in mm for this cylinder.")


class TeethCreate(TeethBase):
    """Body required to add a cylinder reference row."""

    model_config = {
        "json_schema_extra": {
            "example": {"teeth": 64, "paper_size": 520}
        }
    }


class TeethUpdate(BaseModel):
    """Body for updating a cylinder row (all fields optional)."""
    teeth:      Optional[int] = None
    paper_size: Optional[int] = None


class TeethOut(TeethBase):
    """Cylinder (teeth) record returned by the API."""

    model_config = ConfigDict(from_attributes=True)
    id: int        = Field(..., description="Auto-incremented primary key.")
    available: bool = Field(True, description="Whether this cylinder is currently available on the press floor.")


# ── Availability update ───────────────────────────────────────────────────────
class AvailabilityUpdate(BaseModel):
    """Body for PATCH availability endpoints."""
    available: bool = Field(..., description="Set to true to mark as available, false to mark as unavailable.")


# ── Calculation request ──────────────────────────────────────────────────────
class CalculationRequest(BaseModel):
    """
    All inputs needed to price a label cylinder run.

    **Workflow**
    1. Call `GET /api/substrates` to populate the substrate dropdown.
    2. Submit this body to `POST /api/calculate`.
    3. Set `save: true` (and supply `client_id` + `order_id`) to persist the
       result in history — otherwise the result is returned but not stored.
    """

    width: float = Field(
        64.5, gt=0,
        description="Label width in mm (the dimension that runs *around* the cylinder).",
        examples=[64.5],
    )
    height: float = Field(
        136, gt=0,
        description="Label height in mm (the dimension that runs *across* the web).",
        examples=[136],
    )
    yield_pct: float = Field(
        85, gt=0, le=100,
        description=(
            "Yield / web-utilisation percentage (0–100). "
            "85 means 85 % of the substrate becomes usable labels; 15 % is gap/trim/waste."
        ),
        examples=[85],
    )
    substrate_name: Optional[str] = Field(
        None,
        description="Free-text substrate name that appears in saved history. "
                    "Use the `name` field from `GET /api/substrates`, or supply a custom value.",
        examples=["PP Gloss"],
    )
    substrate_price: float = Field(
        45, ge=0,
        description="Substrate cost in ₹ per m². Defaults to 45.",
        examples=[45.0],
    )
    foil_cost: float = Field(
        0, ge=0,
        description="Additional hot-foil or lamination cost in ₹ per m². Use 0 if not applicable.",
        examples=[0],
    )
    custom_cost: float = Field(
        0, ge=0,
        description="Extra per-label cost in ₹ (e.g. finishing, handling). Applied per single label.",
        examples=[0],
    )
    selected_teeth: Optional[int] = Field(
        None,
        description="Teeth count of the cylinder the user chose to use. Stored for reference.",
        examples=[64],
    )
    exchange_rate: float = Field(
        85, gt=0,
        description="INR/USD exchange rate used to compute the USD price column.",
        examples=[85],
    )
    order_qty: Optional[int] = Field(
        None, ge=0,
        description="Label quantity for this order. Stored for reference and pre-fills the calculator on edit.",
        examples=[10000],
    )
    save: bool = Field(
        False,
        description=(
            "Set to `true` to persist this calculation in history. "
            "Requires `client_id` and `order_id` to link it to a client/order. "
            "When `false` the result is computed and returned but **not stored**."
        ),
    )
    client_id: Optional[int] = Field(
        None,
        description="ID of the client this calculation belongs to (from `GET /api/clients`). "
                    "Only relevant when `save` is `true`.",
        examples=[1],
    )
    order_id: Optional[int] = Field(
        None,
        description="ID of the order under the client (from `GET /api/clients/{id}/orders`). "
                    "Only relevant when `save` is `true`.",
        examples=[3],
    )

    model_config = {
        "json_schema_extra": {
            "example": {
                "width": 64.5,
                "height": 136,
                "yield_pct": 85,
                "substrate_name": "PP Gloss",
                "substrate_price": 45,
                "foil_cost": 0,
                "exchange_rate": 85,
                "save": False,
                "client_id": None,
                "order_id": None,
            }
        }
    }


# ── Calculation response ─────────────────────────────────────────────────────
class CylinderRow(BaseModel):
    """
    One row of the cylinder comparison table — one entry per teeth value
    in the reference data.  The row whose `teeth` value matches `matched.matched_teeth`
    is the recommended cylinder.
    """

    teeth: int             = Field(..., description="Number of teeth on this cylinder.")
    circumference: float   = Field(..., description="Cylinder circumference in mm (teeth × 3.175).")
    input_width: float     = Field(..., description="The requested label width passed in.")
    around: int            = Field(..., description="Number of labels that fit *around* the cylinder.")
    label_width: float     = Field(..., description="Actual printed label width after fitting (mm).")
    paper_size: int        = Field(..., description="Web/paper width for this cylinder (mm).")
    paper_plus_20: int     = Field(..., description="Paper width + 20 % for bleed/gap (mm).")
    input_height: float    = Field(..., description="The requested label height passed in.")
    across: int            = Field(..., description="Number of labels that fit *across* the web.")
    label_height: float    = Field(..., description="Actual printed label height after fitting (mm).")


class MatchedInfo(BaseModel):
    """The cylinder row selected as the best match for the requested dimensions."""

    index: int             = Field(..., description="Zero-based index into the `rows` array.")
    best_paper_index: int  = Field(..., description="Index of the best paper-size option.")
    matched_width: float   = Field(..., description="Matched label width (mm).")
    matched_height: float  = Field(..., description="Matched label height (mm).")
    matched_teeth: int     = Field(..., description="Teeth count of the recommended cylinder.")


class PricingInfo(BaseModel):
    """
    Pricing summary computed from the matched cylinder.

    All INR amounts include both `substrate_price` and `foil_cost`.
    USD amounts are derived by dividing INR by `exchange_rate`.
    """

    substrate_price: Optional[float] = Field(None, description="Substrate cost used in the calculation (₹/m²).")
    foil_cost: Optional[float]       = Field(None, description="Foil/lamination cost used in the calculation (₹/m²). 0 if not applicable.")
    custom_cost: Optional[float]     = Field(None, description="Extra per-label cost in ₹. Applied directly per single label.")
    label_w_cm: float        = Field(..., description="Matched label width in cm.")
    label_h_cm: float        = Field(..., description="Matched label height in cm.")
    labels_sqm: float        = Field(..., description="Raw labels per m² (before waste adjustment).")
    adj_labels: float        = Field(..., description="Adjusted labels per m² after applying `yield_pct` (yield %).")
    rate_15: float           = Field(..., description="Cylinder rate at 1 : 1.5 ratio (₹ per 1000 labels).")
    rate_175: float          = Field(..., description="Cylinder rate at 1 : 1.75 ratio (₹ per 1000 labels).")
    rate_2: float            = Field(..., description="Cylinder rate at 1 : 2.0 ratio (₹ per 1000 labels).")
    price_inr_label: float   = Field(..., description="Final cost per single label in ₹.")
    price_inr_1000: float    = Field(..., description="Final cost per 1000 labels in ₹ (primary display value).")
    price_usd_label: float   = Field(..., description="Final cost per single label in USD.")
    price_usd_1000: float    = Field(..., description="Final cost per 1000 labels in USD.")


class CalculationResponse(BaseModel):
    """
    Full result of a cylinder calculation.

    Use `matched` to find which row in `rows` was selected, and `pricing` for
    the cost summary to display in the UI.  `calculation_id` is non-null only
    when `save: true` was sent in the request.
    """

    rows: List[CylinderRow]      = Field(..., description="One row per cylinder in the reference table.")
    matched: MatchedInfo         = Field(..., description="The recommended cylinder.")
    pricing: PricingInfo         = Field(..., description="Cost summary for the matched cylinder.")
    calculation_id: Optional[int] = Field(
        None,
        description="Database ID of the saved record. `null` when `save` was `false`.",
    )


# ── Client update ────────────────────────────────────────────────────────────
class ClientUpdate(BaseModel):
    """Body for PATCH /api/clients/{id}."""
    name:     str            = Field(..., min_length=1, max_length=120, description="New unique display name.")
    location: Optional[str] = Field(None, max_length=200, description="Office/city location.")
    industry: Optional[str] = Field(None, max_length=120, description="Industry or sector.")
    email:    Optional[str] = Field(None, max_length=200, description="Primary contact email.")
    phone:    Optional[str] = Field(None, max_length=30,  description="Primary contact phone.")


# ── Cylinder selection update ────────────────────────────────────────────────
class CylinderUpdate(BaseModel):
    """Body for PATCH /api/calculations/{id}/cylinder."""
    selected_teeth: int = Field(..., description="Teeth count of the approved cylinder.")


# ── Status update ────────────────────────────────────────────────────────────
class StatusUpdate(BaseModel):
    """Body for PATCH /api/calculations/{id}/status."""

    status: str = Field(
        ...,
        description="New status value. Must be one of: `pending`, `confirmed`, `rejected`.",
        examples=["confirmed"],
    )

    model_config = {
        "json_schema_extra": {"example": {"status": "confirmed"}}
    }


# ── Saved calculation history ────────────────────────────────────────────────
class CalculationHistoryOut(BaseModel):
    """A row in the saved-calculation history list."""

    model_config = ConfigDict(from_attributes=True)

    id: int                    = Field(..., description="Database ID.")
    width: float               = Field(..., description="Label width that was calculated (mm).")
    height: float              = Field(..., description="Label height that was calculated (mm).")
    yield_pct: float           = Field(..., description="Yield percentage used (higher = less waste).")
    substrate_name: Optional[str] = Field(None, description="Substrate name at time of calculation.")
    substrate_price: float     = Field(..., description="Substrate price used (₹/m²).")
    foil_cost: float           = Field(..., description="Foil cost used (₹/m²).")
    custom_cost: float         = Field(0,   description="Extra per-label cost used (₹/label).")
    selected_teeth: Optional[int] = Field(None, description="Teeth count of the user-selected cylinder.")
    exchange_rate: float       = Field(..., description="Exchange rate used (₹ per $).")
    order_qty: Optional[int]   = Field(None, description="Label quantity for this order.")
    created_at: datetime       = Field(..., description="UTC timestamp when this was saved.")
    client_id: Optional[int]   = Field(None, description="Linked client ID, if any.")
    order_id: Optional[int]    = Field(None, description="Linked order ID, if any.")
    client_name: Optional[str] = Field(None, description="Client name (denormalised for display).")
    order_name: Optional[str]  = Field(None, description="Order name (denormalised for display).")
    status: str                = Field("pending", description="Quote status: `pending`, `confirmed`, or `rejected`.")
    pricing: Optional[dict]    = Field(None, description="Pricing summary from the saved result JSON.")
    created_by_name: Optional[str] = Field(None, description="Username of who created this calculation.")
    updated_by_name: Optional[str] = Field(None, description="Username of who last updated this calculation.")
    updated_at: Optional[datetime]  = Field(None, description="When this calculation was last updated.")


# ── Calculation version ──────────────────────────────────────────────────────
class CalculationVersionOut(BaseModel):
    """One edited revision of a saved calculation."""

    model_config = ConfigDict(from_attributes=True)

    id:             int
    calculation_id: int
    version_number: int
    width:          float
    height:         float
    yield_pct:      float
    substrate_name: Optional[str]  = None
    substrate_price: float
    foil_cost:      float
    custom_cost:    float
    selected_teeth: Optional[int]  = None
    exchange_rate:  float
    status:         str
    created_by_name: Optional[str] = None
    created_at:     datetime
    result:         Optional[dict] = None


# ── Auth ──────────────────────────────────────────────────────────────────────
class LoginRequest(BaseModel):
    email: str    = Field(..., description="User email address.")
    password: str = Field(..., description="Plain-text password.")


class TokenResponse(BaseModel):
    access_token: str = Field(..., description="JWT bearer token.")
    token_type: str   = Field("bearer")
    user: "UserOut"


# ── User management ───────────────────────────────────────────────────────────
class UserCreate(BaseModel):
    username: str          = Field(..., min_length=2, max_length=80)
    email:    str          = Field(..., max_length=200)
    password: str          = Field(..., min_length=4)
    role:     str          = Field("user", pattern="^(admin|user)$")


class UserUpdate(BaseModel):
    username:  Optional[str]  = Field(None, min_length=2, max_length=80)
    email:     Optional[str]  = Field(None, max_length=200)
    password:  Optional[str]  = Field(None, min_length=4)
    role:      Optional[str]  = Field(None, pattern="^(admin|user)$")
    is_active: Optional[bool] = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id:         int      = Field(..., description="User ID.")
    username:   str
    email:      str
    role:       str
    is_active:  bool
    created_at: datetime


# ── Company Settings ──────────────────────────────────────────────────────────
class CompanySettingsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    company_name: str              = "Chromaprint India"
    tagline:      Optional[str]    = None
    industry:     Optional[str]    = None
    address:      Optional[str]    = None
    location:     Optional[str]    = None
    state:        Optional[str]    = None
    country:      Optional[str]    = "India"
    email:        Optional[str]    = None
    phone:        Optional[str]    = None
    website:      Optional[str]    = None
    gst_number:   Optional[str]    = None
    cgst_pct:     Optional[float]  = None
    sgst_pct:     Optional[float]  = None
    updated_at:   Optional[datetime] = None


class CompanySettingsUpdate(BaseModel):
    company_name: Optional[str]    = Field(None, max_length=120)
    tagline:      Optional[str]    = Field(None, max_length=200)
    industry:     Optional[str]    = Field(None, max_length=120)
    address:      Optional[str]    = Field(None, max_length=300)
    location:     Optional[str]    = Field(None, max_length=120)
    state:        Optional[str]    = Field(None, max_length=100)
    country:      Optional[str]    = Field(None, max_length=100)
    email:        Optional[str]    = Field(None, max_length=200)
    phone:        Optional[str]    = Field(None, max_length=30)
    website:      Optional[str]    = Field(None, max_length=200)
    gst_number:   Optional[str]    = Field(None, max_length=50)
    cgst_pct:     Optional[float]  = Field(None, ge=0, le=100)
    sgst_pct:     Optional[float]  = Field(None, ge=0, le=100)


TokenResponse.model_rebuild()
