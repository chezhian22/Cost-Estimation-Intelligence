import uuid


def uid():
    return uuid.uuid4().hex[:6]


def test_list_teeth_empty(client):
    r = client.get("/api/teeth")
    assert r.status_code == 200
    assert r.json() == []


def test_create_cylinder(client):
    r = client.post("/api/teeth", json={"teeth": 64, "paper_size": 520})
    assert r.status_code == 201
    body = r.json()
    assert body["teeth"] == 64
    assert body["paper_size"] == 520
    assert body["available"] is True
    assert "id" in body


def test_list_teeth_sorted_ascending(client):
    client.post("/api/teeth", json={"teeth": 96, "paper_size": 780})
    client.post("/api/teeth", json={"teeth": 64, "paper_size": 520})
    client.post("/api/teeth", json={"teeth": 80, "paper_size": 650})
    r = client.get("/api/teeth")
    vals = [t["teeth"] for t in r.json()]
    assert vals == sorted(vals)


def test_update_cylinder_paper_size(client):
    r = client.post("/api/teeth", json={"teeth": 64, "paper_size": 520})
    tid = r.json()["id"]
    r = client.patch(f"/api/teeth/{tid}", json={"paper_size": 600})
    assert r.status_code == 200
    assert r.json()["paper_size"] == 600


def test_update_cylinder_teeth_count(client):
    r = client.post("/api/teeth", json={"teeth": 64, "paper_size": 520})
    tid = r.json()["id"]
    r = client.patch(f"/api/teeth/{tid}", json={"teeth": 70})
    assert r.status_code == 200
    assert r.json()["teeth"] == 70


def test_update_cylinder_not_found(client):
    r = client.patch("/api/teeth/99999", json={"paper_size": 600})
    assert r.status_code == 404


def test_delete_cylinder(client):
    r = client.post("/api/teeth", json={"teeth": 64, "paper_size": 520})
    tid = r.json()["id"]
    r = client.delete(f"/api/teeth/{tid}")
    assert r.status_code == 204
    ids = [t["id"] for t in client.get("/api/teeth").json()]
    assert tid not in ids


def test_delete_cylinder_not_found(client):
    r = client.delete("/api/teeth/99999")
    assert r.status_code == 404


def test_set_cylinder_unavailable(client):
    r = client.post("/api/teeth", json={"teeth": 64, "paper_size": 520})
    tid = r.json()["id"]
    r = client.patch(f"/api/teeth/{tid}/availability", json={"available": False})
    assert r.status_code == 200
    assert r.json()["available"] is False


def test_set_cylinder_available_again(client):
    r = client.post("/api/teeth", json={"teeth": 64, "paper_size": 520})
    tid = r.json()["id"]
    client.patch(f"/api/teeth/{tid}/availability", json={"available": False})
    r = client.patch(f"/api/teeth/{tid}/availability", json={"available": True})
    assert r.status_code == 200
    assert r.json()["available"] is True


def test_cylinder_availability_not_found(client):
    r = client.patch("/api/teeth/99999/availability", json={"available": False})
    assert r.status_code == 404


def test_create_duplicate_teeth_returns_409(client):
    client.post("/api/teeth", json={"teeth": 64, "paper_size": 520})
    r = client.post("/api/teeth", json={"teeth": 64, "paper_size": 600})
    assert r.status_code == 409


def test_multiple_cylinders_in_list(client):
    client.post("/api/teeth", json={"teeth": 64, "paper_size": 520})
    client.post("/api/teeth", json={"teeth": 80, "paper_size": 650})
    r = client.get("/api/teeth")
    assert len(r.json()) == 2
