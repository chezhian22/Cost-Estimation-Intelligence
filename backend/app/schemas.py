"""Pydantic schemas for API request and response bodies."""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


# ── Substrate ────────────────────────────────────────────────────────────────
class SubstrateBase(BaseModel):
    name: str
    price: float


class SubstrateCreate(SubstrateBase):
    pass


class SubstrateOut(SubstrateBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


# ── Teeth ────────────────────────────────────────────────────────────────────
class TeethBase(BaseModel):
    teeth: int
    paper_size: int


class TeethCreate(TeethBase):
    pass


class TeethOut(TeethBase):
    model_config = ConfigDict(from_attributes=True)
    id: int


# ── Calculation request ──────────────────────────────────────────────────────
class CalculationRequest(BaseModel):
    width: float = Field(64.5, gt=0)
    height: float = Field(136, gt=0)
    waste_pct: float = Field(85, gt=0, le=100)
    substrate_name: Optional[str] = None
    substrate_price: float = Field(45, ge=0)
    foil_cost: float = Field(0, ge=0)
    exchange_rate: float = Field(85, gt=0)
    save: bool = False  # persist this calculation to history?


# ── Calculation response ─────────────────────────────────────────────────────
class CylinderRow(BaseModel):
    teeth: int
    circumference: float
    input_width: float
    around: int
    label_width: float
    paper_size: int
    paper_plus_20: int
    input_height: float
    across: int
    label_height: float


class MatchedInfo(BaseModel):
    index: int
    best_paper_index: int
    matched_width: float
    matched_height: float
    matched_teeth: int


class PricingInfo(BaseModel):
    label_w_cm: float
    label_h_cm: float
    labels_sqm: float
    adj_labels: float
    rate_15: float
    rate_175: float
    rate_2: float
    price_inr_label: float
    price_inr_1000: float
    price_usd_label: float
    price_usd_1000: float


class CalculationResponse(BaseModel):
    rows: List[CylinderRow]
    matched: MatchedInfo
    pricing: PricingInfo
    calculation_id: Optional[int] = None


# ── Saved calculation history ────────────────────────────────────────────────
class CalculationHistoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    width: float
    height: float
    waste_pct: float
    substrate_name: Optional[str]
    substrate_price: float
    foil_cost: float
    exchange_rate: float
    created_at: datetime
