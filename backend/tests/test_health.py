def test_health_returns_ok(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_health_requires_no_auth(client):
    # Must be reachable without any Authorization header
    r = client.get("/api/health")
    assert r.status_code == 200
