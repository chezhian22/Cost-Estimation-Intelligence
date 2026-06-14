import uuid


def uid():
    return uuid.uuid4().hex[:6]


def _new_client(client):
    r = client.post("/api/clients", json={"name": f"C_{uid()}"})
    assert r.status_code == 201
    return r.json()["id"]


def test_list_orders_empty(client):
    cid = _new_client(client)
    r = client.get(f"/api/clients/{cid}/orders")
    assert r.status_code == 200
    assert r.json() == []


def test_create_order(client):
    cid = _new_client(client)
    r = client.post(f"/api/clients/{cid}/orders", json={"name": "Order #1"})
    assert r.status_code == 201
    body = r.json()
    assert body["client_id"] == cid
    assert body["name"] == "Order #1"
    assert "id" in body
    assert "created_at" in body


def test_create_order_with_date(client):
    cid = _new_client(client)
    r = client.post(f"/api/clients/{cid}/orders", json={
        "name": "Order #1",
        "order_date": "2025-06-01",
    })
    assert r.status_code == 201
    assert r.json()["order_date"] == "2025-06-01"


def test_list_orders_newest_first(client):
    cid = _new_client(client)
    client.post(f"/api/clients/{cid}/orders", json={"name": "Order #1"})
    client.post(f"/api/clients/{cid}/orders", json={"name": "Order #2"})
    r = client.get(f"/api/clients/{cid}/orders")
    assert r.status_code == 200
    names = [o["name"] for o in r.json()]
    assert names[0] == "Order #2"


def test_list_orders_client_not_found(client):
    r = client.get("/api/clients/99999/orders")
    assert r.status_code == 404


def test_create_order_client_not_found(client):
    r = client.post("/api/clients/99999/orders", json={"name": "Order #1"})
    assert r.status_code == 404


def test_rename_order(client):
    cid = _new_client(client)
    r = client.post(f"/api/clients/{cid}/orders", json={"name": "Old Name"})
    oid = r.json()["id"]
    r = client.patch(f"/api/orders/{oid}", json={"name": "New Name"})
    assert r.status_code == 200
    assert r.json()["name"] == "New Name"


def test_rename_order_not_found(client):
    r = client.patch("/api/orders/99999", json={"name": "Ghost"})
    assert r.status_code == 404


def test_get_order_calculations_empty(client):
    cid = _new_client(client)
    r = client.post(f"/api/clients/{cid}/orders", json={"name": "Order #1"})
    oid = r.json()["id"]
    r = client.get(f"/api/orders/{oid}/calculations")
    assert r.status_code == 200
    assert r.json() == []


def test_get_order_calculations_not_found(client):
    r = client.get("/api/orders/99999/calculations")
    assert r.status_code == 404


def test_multiple_orders_per_client(client):
    cid = _new_client(client)
    for i in range(3):
        client.post(f"/api/clients/{cid}/orders", json={"name": f"Order #{i + 1}"})
    r = client.get(f"/api/clients/{cid}/orders")
    assert len(r.json()) == 3
