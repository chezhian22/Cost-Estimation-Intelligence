"""
Pure unit tests for the calculator module — no DB, no HTTP.
These run instantly and verify the core business logic formulas.
"""
import math
import pytest
from app.calculator import calculate, js_round, xlookup_closest

SINGLE_CYLINDER = [{"teeth": 64, "paper_size": 520}]
MULTI_CYLINDERS = [
    {"teeth": 64, "paper_size": 520},
    {"teeth": 80, "paper_size": 650},
    {"teeth": 96, "paper_size": 780},
]


# ── js_round ──────────────────────────────────────────────────────────────────

class TestJsRound:
    def test_half_rounds_up(self):
        assert js_round(0.5) == 1
        assert js_round(1.5) == 2
        assert js_round(2.5) == 3

    def test_below_half_rounds_down(self):
        assert js_round(0.4) == 0
        assert js_round(1.49) == 1

    def test_exact_integers_unchanged(self):
        assert js_round(0.0) == 0
        assert js_round(3.0) == 3
        assert js_round(100.0) == 100

    def test_negative_half(self):
        # floor(-0.5 + 0.5) = floor(0.0) = 0
        assert js_round(-0.5) == 0

    def test_returns_int(self):
        assert isinstance(js_round(2.7), int)


# ── xlookup_closest ───────────────────────────────────────────────────────────

class TestXlookupClosest:
    def test_exact_match(self):
        assert xlookup_closest(5.0, [3.0, 5.0, 7.0], ["a", "b", "c"]) == "b"

    def test_closer_to_upper(self):
        assert xlookup_closest(4.6, [3.0, 5.0, 7.0], ["a", "b", "c"]) == "b"

    def test_closer_to_lower(self):
        assert xlookup_closest(3.9, [3.0, 5.0, 7.0], ["a", "b", "c"]) == "a"

    def test_single_element_always_matches(self):
        assert xlookup_closest(999.0, [1.0], ["only"]) == "only"

    def test_result_and_lookup_index_are_aligned(self):
        result = xlookup_closest(10.0, [8.0, 10.0, 12.0], [100, 200, 300])
        assert result == 200


# ── calculate ─────────────────────────────────────────────────────────────────

class TestCalculate:
    def test_output_has_required_top_level_keys(self):
        r = calculate(64.5, 136, 85, 45, 0, 85, SINGLE_CYLINDER)
        assert set(r.keys()) >= {"rows", "matched", "pricing"}

    def test_row_count_equals_teeth_data_length(self):
        r = calculate(64.5, 136, 85, 45, 0, 85, MULTI_CYLINDERS)
        assert len(r["rows"]) == 3

    def test_circumference_formula(self):
        r = calculate(64.5, 136, 85, 45, 0, 85, SINGLE_CYLINDER)
        row = r["rows"][0]
        assert abs(row["circumference"] - 64 * 3.175) < 1e-9

    def test_paper_plus_20(self):
        r = calculate(64.5, 136, 85, 45, 0, 85, SINGLE_CYLINDER)
        row = r["rows"][0]
        assert row["paper_plus_20"] == row["paper_size"] + 20

    def test_matched_teeth_is_in_rows(self):
        r = calculate(64.5, 136, 85, 45, 0, 85, MULTI_CYLINDERS)
        all_teeth = {row["teeth"] for row in r["rows"]}
        assert r["matched"]["matched_teeth"] in all_teeth

    def test_matched_index_is_valid(self):
        r = calculate(64.5, 136, 85, 45, 0, 85, MULTI_CYLINDERS)
        idx = r["matched"]["index"]
        assert 0 <= idx < len(r["rows"])

    def test_best_paper_index_differs_from_matched_when_multiple(self):
        r = calculate(64.5, 136, 85, 45, 0, 85, MULTI_CYLINDERS)
        assert r["matched"]["index"] != r["matched"]["best_paper_index"]

    def test_adj_labels_formula(self):
        r = calculate(64.5, 136, 85, 45, 0, 85, SINGLE_CYLINDER)
        p = r["pricing"]
        assert abs(p["adj_labels"] - p["labels_sqm"] * 85 / 100) < 1e-6

    def test_price_inr_1000_equals_rate_2(self):
        r = calculate(64.5, 136, 85, 45, 0, 85, SINGLE_CYLINDER)
        p = r["pricing"]
        assert abs(p["price_inr_1000"] - p["rate_2"]) < 1e-9

    def test_price_usd_derived_from_inr(self):
        exchange = 85.0
        r = calculate(64.5, 136, 85, 45, 0, exchange, SINGLE_CYLINDER)
        p = r["pricing"]
        assert abs(p["price_usd_1000"] - p["price_inr_1000"] / exchange) < 1e-6

    def test_rate_progression_15_175_2(self):
        r = calculate(64.5, 136, 85, 45, 0, 85, SINGLE_CYLINDER)
        p = r["pricing"]
        assert p["rate_15"] < p["rate_175"] < p["rate_2"]

    def test_zero_substrate_price_gives_zero_cost(self):
        r = calculate(64.5, 136, 85, 0, 0, 85, SINGLE_CYLINDER)
        assert r["pricing"]["price_inr_1000"] == 0.0

    def test_foil_cost_raises_price(self):
        r_base = calculate(64.5, 136, 85, 45, 0, 85, SINGLE_CYLINDER)
        r_foil = calculate(64.5, 136, 85, 45, 10, 85, SINGLE_CYLINDER)
        assert r_foil["pricing"]["price_inr_1000"] > r_base["pricing"]["price_inr_1000"]

    def test_custom_cost_raises_price(self):
        r_base = calculate(64.5, 136, 85, 45, 0, 85, SINGLE_CYLINDER, custom_cost=0)
        r_cc   = calculate(64.5, 136, 85, 45, 0, 85, SINGLE_CYLINDER, custom_cost=5)
        assert r_cc["pricing"]["price_inr_1000"] > r_base["pricing"]["price_inr_1000"]

    def test_higher_yield_lowers_price(self):
        r_low  = calculate(64.5, 136, 70, 45, 0, 85, SINGLE_CYLINDER)
        r_high = calculate(64.5, 136, 95, 45, 0, 85, SINGLE_CYLINDER)
        assert r_high["pricing"]["price_inr_1000"] < r_low["pricing"]["price_inr_1000"]

    def test_label_dimensions_in_cm(self):
        r = calculate(64.5, 136, 85, 45, 0, 85, SINGLE_CYLINDER)
        p = r["pricing"]
        m = r["matched"]
        assert abs(p["label_w_cm"] - m["matched_width"] / 10) < 1e-6
        assert abs(p["label_h_cm"] - m["matched_height"] / 10) < 1e-6

    def test_pricing_substrate_and_foil_stored(self):
        r = calculate(64.5, 136, 85, 55, 8, 85, SINGLE_CYLINDER)
        p = r["pricing"]
        assert p["substrate_price"] == 55
        assert p["foil_cost"] == 8

    def test_custom_cost_stored_in_pricing(self):
        r = calculate(64.5, 136, 85, 45, 0, 85, SINGLE_CYLINDER, custom_cost=3.5)
        assert r["pricing"]["custom_cost"] == 3.5

    def test_across_is_floor_of_paper_height_ratio(self):
        r = calculate(64.5, 136, 85, 45, 0, 85, SINGLE_CYLINDER)
        row = r["rows"][0]
        expected_across = math.floor(520 / 136)
        assert row["across"] == expected_across

    def test_price_inr_label_is_per_unit(self):
        r = calculate(64.5, 136, 85, 45, 0, 85, SINGLE_CYLINDER)
        p = r["pricing"]
        assert abs(p["price_inr_label"] - p["price_inr_1000"] / 1000) < 1e-9

    def test_price_usd_label_is_per_unit(self):
        r = calculate(64.5, 136, 85, 45, 0, 85, SINGLE_CYLINDER)
        p = r["pricing"]
        assert abs(p["price_usd_label"] - p["price_usd_1000"] / 1000) < 1e-9
