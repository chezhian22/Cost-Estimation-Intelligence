import uuid


def uid():
    return uuid.uuid4().hex[:6]


def test_list_substrates_empty(client):
    r = client.get("/api/substrates")
    assert r.status_code == 200
    assert r.json() == []


def test_create_substrate(client):
    r = client.post("/api/substrates", json={"name": f"PP_{uid()}", "price": 45.0})
    assert r.status_code == 201
    body = r.json()
    assert "id" in body
    assert body["price"] == 45.0
    assert body["available"] is True


def test_list_substrates_contains_created(client):
    name = f"PET_{uid()}"
    client.post("/api/substrates", json={"name": name, "price": 60.0})
    r = client.get("/api/substrates")
    names = [s["name"] for s in r.json()]
    assert name in names


def test_create_multiple_substrates(client):
    for i in range(3):
        client.post("/api/substrates", json={"name": f"Sub{i}_{uid()}", "price": float(i * 10)})
    r = client.get("/api/substrates")
    assert len(r.json()) == 3


def test_update_substrate_price(client):
    r = client.post("/api/substrates", json={"name": f"Sub_{uid()}", "price": 10.0})
    sid = r.json()["id"]
    r = client.patch(f"/api/substrates/{sid}", json={"price": 99.0})
    assert r.status_code == 200
    assert r.json()["price"] == 99.0


def test_update_substrate_name(client):
    r = client.post("/api/substrates", json={"name": f"Old_{uid()}", "price": 10.0})
    sid = r.json()["id"]
    new_name = f"New_{uid()}"
    r = client.patch(f"/api/substrates/{sid}", json={"name": new_name})
    assert r.status_code == 200
    assert r.json()["name"] == new_name


def test_update_substrate_not_found(client):
    r = client.patch("/api/substrates/99999", json={"price": 10.0})
    assert r.status_code == 404


def test_delete_substrate(client):
    r = client.post("/api/substrates", json={"name": f"Del_{uid()}", "price": 20.0})
    sid = r.json()["id"]
    r = client.delete(f"/api/substrates/{sid}")
    assert r.status_code == 204
    ids = [s["id"] for s in client.get("/api/substrates").json()]
    assert sid not in ids


def test_delete_substrate_not_found(client):
    r = client.delete("/api/substrates/99999")
    assert r.status_code == 404


def test_set_substrate_unavailable(client):
    r = client.post("/api/substrates", json={"name": f"Avail_{uid()}", "price": 30.0})
    sid = r.json()["id"]
    r = client.patch(f"/api/substrates/{sid}/availability", json={"available": False})
    assert r.status_code == 200
    assert r.json()["available"] is False


def test_set_substrate_available_again(client):
    r = client.post("/api/substrates", json={"name": f"Re_{uid()}", "price": 30.0})
    sid = r.json()["id"]
    client.patch(f"/api/substrates/{sid}/availability", json={"available": False})
    r = client.patch(f"/api/substrates/{sid}/availability", json={"available": True})
    assert r.status_code == 200
    assert r.json()["available"] is True


def test_substrate_availability_not_found(client):
    r = client.patch("/api/substrates/99999/availability", json={"available": False})
    assert r.status_code == 404


def test_create_duplicate_substrate_name_returns_409(client):
    name = f"Dup_{uid()}"
    client.post("/api/substrates", json={"name": name, "price": 45.0})
    r = client.post("/api/substrates", json={"name": name, "price": 60.0})
    assert r.status_code == 409


def test_substrate_appears_in_list_with_correct_fields(client):
    name = f"Check_{uid()}"
    client.post("/api/substrates", json={"name": name, "price": 55.5})
    sub = next(s for s in client.get("/api/substrates").json() if s["name"] == name)
    assert sub["price"] == 55.5
    assert sub["available"] is True
    assert "id" in sub
