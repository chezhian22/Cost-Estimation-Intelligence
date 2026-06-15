ADMIN_EMAIL = "admin@gmail.com"
ADMIN_PASS = "1234"


def test_login_success(client):
    r = client.post("/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
    assert r.status_code == 200
    body = r.json()
    # No token in response body — it lives in the HttpOnly cookie
    assert "access_token" not in body
    assert body["user"]["email"] == ADMIN_EMAIL
    assert body["user"]["role"] == "admin"
    assert body["user"]["is_active"] is True


def test_login_sets_httponly_cookie(client):
    r = client.post("/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
    assert r.status_code == 200
    assert "cp_token" in r.cookies


def test_login_wrong_password(client):
    r = client.post("/api/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
    assert r.status_code == 401


def test_login_unknown_email(client):
    r = client.post("/api/auth/login", json={"email": "nobody@example.com", "password": "x"})
    assert r.status_code == 401


def test_me_authenticated(client, admin_headers):
    r = client.get("/api/auth/me", headers=admin_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["email"] == ADMIN_EMAIL
    assert body["is_active"] is True
    assert body["role"] == "admin"


def test_me_no_token(client):
    client.cookies.clear()
    r = client.get("/api/auth/me")
    assert r.status_code == 401


def test_me_invalid_token(client):
    client.cookies.clear()
    r = client.get("/api/auth/me", headers={"Authorization": "Bearer not.a.valid.token"})
    assert r.status_code == 401


def test_me_malformed_header(client):
    client.cookies.clear()
    r = client.get("/api/auth/me", headers={"Authorization": "Basic dXNlcjpwYXNz"})
    assert r.status_code == 401


def test_login_cookie_authenticates(client):
    """Cookie set by login should authenticate subsequent requests."""
    login_r = client.post("/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
    assert login_r.status_code == 200
    # TestClient persists cookies between requests
    r = client.get("/api/auth/me")
    assert r.status_code == 200
    assert r.json()["email"] == ADMIN_EMAIL


def test_logout_clears_cookie(client):
    client.post("/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS})
    r = client.post("/api/auth/logout")
    assert r.status_code == 200
    # Cookie should be gone or expired
    assert client.cookies.get("cp_token") is None
