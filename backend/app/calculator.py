"""
Core cylinder / label-costing calculation engine.

This is a faithful port of the original Excel formulas (and the vanilla-JS
implementation in app.js). All formulas are preserved exactly, including the
JS `Math.round` half-up behaviour (Python's built-in round() uses banker's
rounding, so we re-implement it with floor(x + 0.5)).
"""

import math
from typing import List, Sequence


def js_round(x: float) -> int:
    """Replicate JavaScript Math.round (round half up toward +Infinity)."""
    return math.floor(x + 0.5)


def xlookup_closest(target: float, lookup: Sequence[float], result: Sequence[float]):
    """
    XLOOKUP-with-closest-match equivalent.
    Returns the entry in `result` whose corresponding `lookup` value has the
    smallest absolute difference from `target`.
    """
    diffs = [abs(v - target) for v in lookup]
    min_diff = min(diffs)
    return result[diffs.index(min_diff)]


def calculate(
    width: float,
    height: float,
    yield_pct: float,
    substrate_price: float,
    foil_cost: float,
    exchange_rate: float,
    teeth_data: List[dict],
    custom_cost: float = 0,
) -> dict:
    """
    Run the full cylinder calculation.

    Parameters
    ----------
    width, height       : label target dimensions in mm
    yield_pct           : yield/utilisation percentage (e.g. 85 means 85% of substrate becomes labels)
    substrate_price     : substrate cost per square metre
    foil_cost           : foil cost (kept for parity with the original sheet;
                          not added into the per-label cost, matching the
                          original behaviour)
    exchange_rate       : INR per USD
    teeth_data          : list of {"teeth": int, "paper_size": int} dicts

    Returns
    -------
    dict with `rows`, `matched`, and `pricing` sections.
    """
    width = width or 1
    height = height or 1
    yield_pct = yield_pct or 85
    substrate_price = substrate_price or 0
    exchange_rate = exchange_rate or 85

    rows = []
    for entry in teeth_data:
        teeth = entry["teeth"]
        paper_size = entry["paper_size"]

        circumference = teeth * 3.175                 # B = A * 3.175
        input_width = circumference / width           # C = B / width
        around = js_round(input_width)                # D = ROUND(C, 0)
        label_width = circumference / around          # E = B / D
        paper_plus_20 = paper_size + 20               # G = F + 20
        input_height = paper_size / height            # H = F / height
        across = math.floor(input_height)             # I = ROUNDDOWN(H, 0)
        label_height = paper_size / across + 20 / across  # J = F/I + 20/I

        rows.append({
            "teeth": teeth,
            "circumference": circumference,
            "input_width": input_width,
            "around": around,
            "label_width": label_width,
            "paper_size": paper_size,
            "paper_plus_20": paper_plus_20,
            "input_height": input_height,
            "across": across,
            "label_height": label_height,
        })

    label_widths = [r["label_width"] for r in rows]

    matched_width = xlookup_closest(width, label_widths, label_widths)
    matched_idx = label_widths.index(matched_width)
    matched_height = rows[matched_idx]["label_height"]  # use actual height from the matched cylinder

    # Row that accommodates the most labels (Around x Across)
    best_paper_idx = 0
    max_labels = 0
    for i, r in enumerate(rows):
        total = r["around"] * r["across"]
        if total > max_labels:
            max_labels = total
            best_paper_idx = i

    label_w_cm = matched_width / 10
    label_h_cm = matched_height / 10
    labels_sqm = (10000 / label_w_cm) / label_h_cm
    adj_labels = labels_sqm * yield_pct / 100

    total_material = substrate_price + foil_cost
    cost_per_label = (total_material / adj_labels if adj_labels > 0 else 0) + custom_cost
    rate_15 = cost_per_label * 1500
    rate_175 = cost_per_label * 1750
    rate_2 = cost_per_label * 2000

    price_inr_1000 = rate_2
    price_inr_label = price_inr_1000 / 1000
    price_usd_1000 = rate_2 / exchange_rate if exchange_rate > 0 else 0
    price_usd_label = price_usd_1000 / 1000

    return {
        "rows": rows,
        "matched": {
            "index": matched_idx,
            "best_paper_index": best_paper_idx,
            "matched_width": matched_width,
            "matched_height": matched_height,
            "matched_teeth": rows[matched_idx]["teeth"],
        },
        "pricing": {
            "substrate_price": substrate_price,
            "foil_cost": foil_cost,
            "custom_cost": custom_cost,
            "label_w_cm": label_w_cm,
            "label_h_cm": label_h_cm,
            "labels_sqm": labels_sqm,
            "adj_labels": adj_labels,
            "rate_15": rate_15,
            "rate_175": rate_175,
            "rate_2": rate_2,
            "price_inr_label": price_inr_label,
            "price_inr_1000": price_inr_1000,
            "price_usd_label": price_usd_label,
            "price_usd_1000": price_usd_1000,
        },
    }
