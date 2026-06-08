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

    model_config = {
        "json_schema_extra": {
            "example": {"name": "Kingfisher Breweries"}
        }
    }


class ClientOut(BaseModel):
    """Client record returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: int = Field(..., description="Auto-incremented primary key.")
    name: str = Field(..., description="Unique client name.")
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
    exchange_rate: float = Field(
        85, gt=0,
        description="INR/USD exchange rate used to compute the USD price column.",
        examples=[85],
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

    All INR amounts use the `substrate_price` and `foil_cost` supplied in the request.
    USD amounts are derived by dividing INR by `exchange_rate`.
    """

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
    exchange_rate: float       = Field(..., description="Exchange rate used (₹ per $).")
    created_at: datetime       = Field(..., description="UTC timestamp when this was saved.")
    client_id: Optional[int]   = Field(None, description="Linked client ID, if any.")
    order_id: Optional[int]    = Field(None, description="Linked order ID, if any.")
    client_name: Optional[str] = Field(None, description="Client name (denormalised for display).")
    order_name: Optional[str]  = Field(None, description="Order name (denormalised for display).")
    status: str                = Field("pending", description="Quote status: `pending`, `confirmed`, or `rejected`.")
    pricing: Optional[dict]    = Field(None, description="Pricing summary from the saved result JSON.")
