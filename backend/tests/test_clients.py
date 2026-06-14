import uuid


def uid():
    return uuid.uuid4().hex[:6]


def test_list_clients_empty(client):
    r = client.get("/api/clients")
    assert r.status_code == 200
    assert r.json() == []


def test_create_client_minimal(client):
    r = client.post("/api/clients", json={"name": f"Acme_{uid()}"})
    assert r.status_code == 201
    body = r.json()
    assert "id" in body
    assert isinstance(body["id"], int)
    assert body["location"] is None
    assert body["industry"] is None
    assert body["email"] is None
    assert body["phone"] is None


def test_create_client_full_profile(client):
    name = f"Full_{uid()}"
    r = client.post("/api/clients", json={
        "name": name,
        "location": "Chennai",
        "industry": "Beverages",
        "email": "contact@example.com",
        "phone": "+91 9999999999",
    })
    assert r.status_code == 201
    body = r.json()
    assert body["name"] == name
    assert body["location"] == "Chennai"
    assert body["industry"] == "Beverages"
    assert body["email"] == "contact@example.com"
    assert body["phone"] == "+91 9999999999"


def test_list_clients_contains_created(client):
    name = f"Listed_{uid()}"
    client.post("/api/clients", json={"name": name})
    r = client.get("/api/clients")
    assert r.status_code == 200
    names = [c["name"] for c in r.json()]
    assert name in names


def test_list_clients_sorted_alphabetically(client):
    client.post("/api/clients", json={"name": "Z_Company"})
    client.post("/api/clients", json={"name": "A_Company"})
    r = client.get("/api/clients")
    names = [c["name"] for c in r.json()]
    assert names == sorted(names)


def test_create_client_duplicate_name_returns_409(client):
    name = f"Dup_{uid()}"
    client.post("/api/clients", json={"name": name})
    r = client.post("/api/clients", json={"name": name})
    assert r.status_code == 409


def test_update_client_name(client):
    r = client.post("/api/clients", json={"name": f"Old_{uid()}"})
    cid = r.json()["id"]
    new_name = f"New_{uid()}"
    r = client.patch(f"/api/clients/{cid}", json={"name": new_name})
    assert r.status_code == 200
    assert r.json()["name"] == new_name


def test_update_client_optional_fields(client):
    r = client.post("/api/clients", json={"name": f"Patch_{uid()}"})
    cid = r.json()["id"]
    r = client.patch(f"/api/clients/{cid}", json={
        "name": f"Updated_{uid()}",
        "location": "Mumbai",
        "email": "info@updated.com",
    })
    assert r.status_code == 200
    body = r.json()
    assert body["location"] == "Mumbai"
    assert body["email"] == "info@updated.com"


def test_update_client_not_found(client):
    r = client.patch("/api/clients/99999", json={"name": "Ghost"})
    assert r.status_code == 404


def test_update_client_duplicate_name_returns_409(client):
    name1 = f"A_{uid()}"
    name2 = f"B_{uid()}"
    r1 = client.post("/api/clients", json={"name": name1})
    client.post("/api/clients", json={"name": name2})
    cid1 = r1.json()["id"]
    r = client.patch(f"/api/clients/{cid1}", json={"name": name2})
    assert r.status_code == 409


def test_update_client_same_name_succeeds(client):
    """Renaming a client to its own name should not raise 409."""
    name = f"Same_{uid()}"
    r = client.post("/api/clients", json={"name": name})
    cid = r.json()["id"]
    r = client.patch(f"/api/clients/{cid}", json={"name": name})
    assert r.status_code == 200


def test_client_created_at_is_present(client):
    r = client.post("/api/clients", json={"name": f"TS_{uid()}"})
    assert "created_at" in r.json()
