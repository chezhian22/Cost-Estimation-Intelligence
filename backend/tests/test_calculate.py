import uuid

BASE = {
    "width": 64.5,
    "height": 136,
    "yield_pct": 85,
    "substrate_price": 45.0,
    "foil_cost": 0.0,
    "exchange_rate": 85.0,
    "save": False,
}
CYLINDER = {"teeth": 64, "paper_size": 520}


def uid():
    return uuid.uuid4().hex[:6]


def _add_cylinder(client):
    r = client.post("/api/teeth", json=CYLINDER)
    assert r.status_code == 201
    return r.json()


def test_calculate_no_cylinders_returns_400(client):
    r = client.post("/api/calculate", json=BASE)
    assert r.status_code == 400


def test_calculate_returns_rows_matched_pricing(client):
    _add_cylinder(client)
    r = client.post("/api/calculate", json=BASE)
    assert r.status_code == 200
    body = r.json()
    assert "rows" in body
    assert "matched" in body
    assert "pricing" in body


def test_calculate_save_false_returns_null_id(client):
    _add_cylinder(client)
    r = client.post("/api/calculate", json=BASE)
    assert r.status_code == 200
    assert r.json()["calculation_id"] is None


def test_calculate_rows_count_equals_cylinder_count(client):
    _add_cylinder(client)
    r = client.post("/api/calculate", json=BASE)
    assert len(r.json()["rows"]) == 1


def test_calculate_matched_contains_teeth(client):
    _add_cylinder(client)
    r = client.post("/api/calculate", json=BASE)
    matched = r.json()["matched"]
    assert matched["matched_teeth"] == 64
    assert "matched_width" in matched
    assert "matched_height" in matched
    assert isinstance(matched["index"], int)


def test_calculate_pricing_all_keys_present(client):
    _add_cylinder(client)
    r = client.post("/api/calculate", json=BASE)
    pricing = r.json()["pricing"]
    required_keys = [
        "price_inr_1000", "price_usd_1000", "price_inr_label", "price_usd_label",
        "adj_labels", "labels_sqm", "rate_15", "rate_175", "rate_2",
        "label_w_cm", "label_h_cm", "substrate_price", "foil_cost",
    ]
    for key in required_keys:
        assert key in pricing, f"Missing pricing key: {key}"


def test_calculate_pricing_values_are_positive(client):
    _add_cylinder(client)
    r = client.post("/api/calculate", json=BASE)
    p = r.json()["pricing"]
    assert p["price_inr_1000"] > 0
    assert p["price_usd_1000"] > 0
    assert p["adj_labels"] > 0
    assert p["labels_sqm"] > 0


def test_calculate_foil_cost_raises_price(client):
    _add_cylinder(client)
    r_no_foil = client.post("/api/calculate", json=BASE)
    r_foil = client.post("/api/calculate", json={**BASE, "foil_cost": 10.0})
    assert r_foil.status_code == 200
    assert r_foil.json()["pricing"]["foil_cost"] == 10.0
    assert (
        r_foil.json()["pricing"]["price_inr_1000"]
        > r_no_foil.json()["pricing"]["price_inr_1000"]
    )


def test_calculate_custom_cost_raises_price(client):
    _add_cylinder(client)
    r_no_cc = client.post("/api/calculate", json=BASE)
    r_cc = client.post("/api/calculate", json={**BASE, "custom_cost": 5.0})
    assert r_cc.status_code == 200
    assert r_cc.json()["pricing"]["custom_cost"] == 5.0
    assert (
        r_cc.json()["pricing"]["price_inr_1000"]
        > r_no_cc.json()["pricing"]["price_inr_1000"]
    )


def test_calculate_save_true_persists_and_returns_id(client):
    _add_cylinder(client)
    cr = client.post("/api/clients", json={"name": f"C_{uid()}"})
    cid = cr.json()["id"]
    or_ = client.post(f"/api/clients/{cid}/orders", json={"name": "Order #1"})
    oid = or_.json()["id"]

    r = client.post("/api/calculate", json={
        **BASE, "save": True, "client_id": cid, "order_id": oid,
    })
    assert r.status_code == 200
    calc_id = r.json()["calculation_id"]
    assert calc_id is not None
    assert isinstance(calc_id, int)

    # Confirm it appears in history
    r2 = client.get(f"/api/calculations/{calc_id}")
    assert r2.status_code == 200
    assert r2.json()["id"] == calc_id


def test_calculate_save_true_links_client_and_order(client):
    _add_cylinder(client)
    cr = client.post("/api/clients", json={"name": f"C_{uid()}"})
    cid = cr.json()["id"]
    or_ = client.post(f"/api/clients/{cid}/orders", json={"name": "Order #1"})
    oid = or_.json()["id"]

    r = client.post("/api/calculate", json={
        **BASE, "save": True, "client_id": cid, "order_id": oid,
    })
    calc_id = r.json()["calculation_id"]

    detail = client.get(f"/api/calculations/{calc_id}").json()
    assert detail["client_id"] == cid
    assert detail["order_id"] == oid


def test_calculate_unavailable_cylinder_excluded(client):
    r = client.post("/api/teeth", json=CYLINDER)
    tid = r.json()["id"]
    client.patch(f"/api/teeth/{tid}/availability", json={"available": False})
    r = client.post("/api/calculate", json=BASE)
    assert r.status_code == 400


def test_calculate_multiple_cylinders_returns_all_rows(client):
    client.post("/api/teeth", json={"teeth": 64, "paper_size": 520})
    client.post("/api/teeth", json={"teeth": 80, "paper_size": 650})
    client.post("/api/teeth", json={"teeth": 96, "paper_size": 780})
    r = client.post("/api/calculate", json=BASE)
    assert r.status_code == 200
    assert len(r.json()["rows"]) == 3


def test_calculate_row_fields(client):
    _add_cylinder(client)
    r = client.post("/api/calculate", json=BASE)
    row = r.json()["rows"][0]
    for field in ("teeth", "circumference", "around", "across", "label_width",
                  "label_height", "paper_size", "paper_plus_20"):
        assert field in row, f"Missing row field: {field}"


def test_calculate_order_qty_stored(client):
    _add_cylinder(client)
    cr = client.post("/api/clients", json={"name": f"C_{uid()}"})
    cid = cr.json()["id"]
    or_ = client.post(f"/api/clients/{cid}/orders", json={"name": "Order #1"})
    oid = or_.json()["id"]
    r = client.post("/api/calculate", json={
        **BASE, "save": True, "client_id": cid, "order_id": oid, "order_qty": 50000,
    })
    calc_id = r.json()["calculation_id"]
    r2 = client.get(f"/api/calculations/{calc_id}")
    assert r2.json()["order_qty"] == 50000
