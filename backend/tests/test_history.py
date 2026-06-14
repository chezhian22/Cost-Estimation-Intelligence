import uuid

BASE = {
    "width": 64.5,
    "height": 136,
    "yield_pct": 85,
    "substrate_price": 45.0,
    "foil_cost": 0.0,
    "exchange_rate": 85.0,
    "save": True,
}


def uid():
    return uuid.uuid4().hex[:6]


def _setup(client):
    """Create a cylinder + client + order + saved calculation. Returns calc_id."""
    client.post("/api/teeth", json={"teeth": 64, "paper_size": 520})
    cr = client.post("/api/clients", json={"name": f"HC_{uid()}"})
    cid = cr.json()["id"]
    or_ = client.post(f"/api/clients/{cid}/orders", json={"name": "Order #1"})
    oid = or_.json()["id"]
    r = client.post("/api/calculate", json={**BASE, "client_id": cid, "order_id": oid})
    assert r.status_code == 200
    return r.json()["calculation_id"]


def test_list_calculations_empty(client):
    r = client.get("/api/calculations")
    assert r.status_code == 200
    assert r.json() == []


def test_list_calculations_returns_saved(client):
    calc_id = _setup(client)
    r = client.get("/api/calculations")
    ids = [c["id"] for c in r.json()]
    assert calc_id in ids


def test_list_calculations_includes_client_and_order_names(client):
    calc_id = _setup(client)
    calcs = client.get("/api/calculations").json()
    entry = next(c for c in calcs if c["id"] == calc_id)
    assert entry["client_name"] is not None
    assert entry["order_name"] is not None


def test_get_calculation_by_id(client):
    calc_id = _setup(client)
    r = client.get(f"/api/calculations/{calc_id}")
    assert r.status_code == 200
    body = r.json()
    assert body["id"] == calc_id
    assert "result" in body
    assert "width" in body
    assert "height" in body
    assert "status" in body


def test_get_calculation_not_found(client):
    r = client.get("/api/calculations/99999")
    assert r.status_code == 404


def test_default_status_is_pending(client):
    calc_id = _setup(client)
    r = client.get(f"/api/calculations/{calc_id}")
    assert r.json()["status"] == "pending"


def test_update_status_to_confirmed(client):
    calc_id = _setup(client)
    r = client.patch(f"/api/calculations/{calc_id}/status", json={"status": "confirmed"})
    assert r.status_code == 200
    assert r.json()["status"] == "confirmed"


def test_update_status_to_rejected(client):
    calc_id = _setup(client)
    r = client.patch(f"/api/calculations/{calc_id}/status", json={"status": "rejected"})
    assert r.status_code == 200
    assert r.json()["status"] == "rejected"


def test_update_status_back_to_pending(client):
    calc_id = _setup(client)
    client.patch(f"/api/calculations/{calc_id}/status", json={"status": "confirmed"})
    r = client.patch(f"/api/calculations/{calc_id}/status", json={"status": "pending"})
    assert r.status_code == 200
    assert r.json()["status"] == "pending"


def test_update_status_invalid_value_returns_400(client):
    calc_id = _setup(client)
    r = client.patch(f"/api/calculations/{calc_id}/status", json={"status": "approved"})
    assert r.status_code == 400


def test_update_status_not_found(client):
    r = client.patch("/api/calculations/99999/status", json={"status": "confirmed"})
    assert r.status_code == 404


def test_update_cylinder_selection(client):
    calc_id = _setup(client)
    r = client.patch(f"/api/calculations/{calc_id}/cylinder", json={"selected_teeth": 64})
    assert r.status_code == 200
    assert r.json()["selected_teeth"] == 64


def test_update_cylinder_not_found(client):
    r = client.patch("/api/calculations/99999/cylinder", json={"selected_teeth": 64})
    assert r.status_code == 404


def test_list_versions_empty(client):
    calc_id = _setup(client)
    r = client.get(f"/api/calculations/{calc_id}/versions")
    assert r.status_code == 200
    assert r.json() == []


def test_list_versions_not_found(client):
    r = client.get("/api/calculations/99999/versions")
    assert r.status_code == 404


def test_create_version(client):
    calc_id = _setup(client)
    r = client.post(f"/api/calculations/{calc_id}/versions", json={
        "width": 70.0, "height": 140, "yield_pct": 90,
        "substrate_price": 50.0, "foil_cost": 0.0, "exchange_rate": 85.0,
    })
    assert r.status_code == 200
    body = r.json()
    assert body["version_number"] == 1
    assert body["calculation_id"] == calc_id
    assert "rows" in body
    assert "pricing" in body


def test_create_second_version_increments_number(client):
    calc_id = _setup(client)
    version_payload = {
        "width": 70.0, "height": 140, "yield_pct": 90,
        "substrate_price": 50.0, "foil_cost": 0.0, "exchange_rate": 85.0,
    }
    client.post(f"/api/calculations/{calc_id}/versions", json=version_payload)
    r = client.post(f"/api/calculations/{calc_id}/versions", json=version_payload)
    assert r.json()["version_number"] == 2


def test_create_version_not_found(client):
    r = client.post("/api/calculations/99999/versions", json={
        "width": 70.0, "height": 140, "yield_pct": 90,
        "substrate_price": 50.0, "foil_cost": 0.0, "exchange_rate": 85.0,
    })
    assert r.status_code == 404


def test_update_version_status(client):
    calc_id = _setup(client)
    r = client.post(f"/api/calculations/{calc_id}/versions", json={
        "width": 70.0, "height": 140, "yield_pct": 90,
        "substrate_price": 50.0, "foil_cost": 0.0, "exchange_rate": 85.0,
    })
    version_id = r.json()["version_id"]

    r = client.patch(f"/api/calculations/versions/{version_id}/status",
                     json={"status": "confirmed"})
    assert r.status_code == 200
    assert r.json()["status"] == "confirmed"
    assert r.json()["id"] == version_id


def test_update_version_status_not_found(client):
    r = client.patch("/api/calculations/versions/99999/status",
                     json={"status": "confirmed"})
    assert r.status_code == 404


def test_order_calculations_endpoint_returns_saved(client):
    client.post("/api/teeth", json={"teeth": 64, "paper_size": 520})
    cr = client.post("/api/clients", json={"name": f"OC_{uid()}"})
    cid = cr.json()["id"]
    or_ = client.post(f"/api/clients/{cid}/orders", json={"name": "Order #1"})
    oid = or_.json()["id"]
    client.post("/api/calculate", json={**BASE, "client_id": cid, "order_id": oid})

    r = client.get(f"/api/orders/{oid}/calculations")
    assert r.status_code == 200
    assert len(r.json()) == 1
    calc = r.json()[0]
    assert calc["status"] == "pending"
    assert "pricing" in calc


def test_list_calculations_newest_first(client):
    # Create cylinder once, then save 3 calculations under different clients/orders
    client.post("/api/teeth", json={"teeth": 64, "paper_size": 520})
    for _ in range(3):
        cr = client.post("/api/clients", json={"name": f"HC_{uid()}"})
        cid = cr.json()["id"]
        or_ = client.post(f"/api/clients/{cid}/orders", json={"name": "Order #1"})
        oid = or_.json()["id"]
        client.post("/api/calculate", json={**BASE, "client_id": cid, "order_id": oid})
    calcs = client.get("/api/calculations").json()
    ids = [c["id"] for c in calcs]
    assert ids == sorted(ids, reverse=True)
