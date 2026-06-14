import uuid
from app.auth import create_access_token


def uid():
    return uuid.uuid4().hex[:6]


def _create_user(client, admin_headers, role="user"):
    r = client.post("/api/users", json={
        "username": f"u_{uid()}",
        "email": f"u_{uid()}@test.com",
        "password": "pass1234",
        "role": role,
    }, headers=admin_headers)
    assert r.status_code == 201
    return r.json()


def _headers_for(user):
    token = create_access_token(user["id"], user["username"], user["role"])
    return {"Authorization": f"Bearer {token}"}


def test_list_users_returns_list_for_admin(client, admin_headers):
    r = client.get("/api/users", headers=admin_headers)
    assert r.status_code == 200
    assert isinstance(r.json(), list)
    # Seeded admin must be present
    emails = [u["email"] for u in r.json()]
    assert "admin@gmail.com" in emails


def test_list_users_requires_auth(client):
    r = client.get("/api/users")
    assert r.status_code == 401


def test_list_users_non_admin_gets_403(client, admin_headers):
    user = _create_user(client, admin_headers, role="user")
    r = client.get("/api/users", headers=_headers_for(user))
    assert r.status_code == 403


def test_create_user_as_admin(client, admin_headers):
    user = _create_user(client, admin_headers)
    assert "id" in user
    assert user["role"] == "user"
    assert user["is_active"] is True
    assert "password" not in user
    assert "password_hash" not in user


def test_create_admin_user(client, admin_headers):
    user = _create_user(client, admin_headers, role="admin")
    assert user["role"] == "admin"


def test_create_user_duplicate_email_returns_409(client, admin_headers):
    email = f"dup_{uid()}@test.com"
    client.post("/api/users", json={
        "username": f"u1_{uid()}", "email": email, "password": "pass1", "role": "user",
    }, headers=admin_headers)
    r = client.post("/api/users", json={
        "username": f"u2_{uid()}", "email": email, "password": "pass2", "role": "user",
    }, headers=admin_headers)
    assert r.status_code == 409


def test_create_user_duplicate_username_returns_409(client, admin_headers):
    username = f"u_{uid()}"
    client.post("/api/users", json={
        "username": username, "email": f"e1_{uid()}@t.com", "password": "pass1", "role": "user",
    }, headers=admin_headers)
    r = client.post("/api/users", json={
        "username": username, "email": f"e2_{uid()}@t.com", "password": "pass2", "role": "user",
    }, headers=admin_headers)
    assert r.status_code == 409


def test_create_user_requires_admin(client):
    r = client.post("/api/users", json={
        "username": f"u_{uid()}", "email": f"e_{uid()}@t.com",
        "password": "pass1234", "role": "user",
    })
    assert r.status_code == 401


def test_update_user_username(client, admin_headers):
    user = _create_user(client, admin_headers)
    new_name = f"renamed_{uid()}"
    r = client.patch(f"/api/users/{user['id']}", json={"username": new_name}, headers=admin_headers)
    assert r.status_code == 200
    assert r.json()["username"] == new_name


def test_update_user_role(client, admin_headers):
    user = _create_user(client, admin_headers, role="user")
    r = client.patch(f"/api/users/{user['id']}", json={"role": "admin"}, headers=admin_headers)
    assert r.status_code == 200
    assert r.json()["role"] == "admin"


def test_update_user_not_found(client, admin_headers):
    r = client.patch("/api/users/99999", json={"username": "ghost"}, headers=admin_headers)
    assert r.status_code == 404


def test_update_user_duplicate_email_returns_409(client, admin_headers):
    u1 = _create_user(client, admin_headers)
    u2 = _create_user(client, admin_headers)
    r = client.patch(f"/api/users/{u2['id']}", json={"email": u1["email"]}, headers=admin_headers)
    assert r.status_code == 409


def test_delete_user(client, admin_headers):
    user = _create_user(client, admin_headers)
    r = client.delete(f"/api/users/{user['id']}", headers=admin_headers)
    assert r.status_code == 204
    ids = [u["id"] for u in client.get("/api/users", headers=admin_headers).json()]
    assert user["id"] not in ids


def test_cannot_delete_own_account(client, admin_headers):
    # Admin's own id is 1
    r = client.delete("/api/users/1", headers=admin_headers)
    assert r.status_code == 400


def test_delete_user_not_found(client, admin_headers):
    r = client.delete("/api/users/99999", headers=admin_headers)
    assert r.status_code == 404


def test_deactivate_user(client, admin_headers):
    user = _create_user(client, admin_headers)
    r = client.patch(f"/api/users/{user['id']}", json={"is_active": False}, headers=admin_headers)
    assert r.status_code == 200
    assert r.json()["is_active"] is False


def test_deactivated_user_cannot_login(client, admin_headers):
    email = f"deact_{uid()}@test.com"
    username = f"deact_{uid()}"
    client.post("/api/users", json={
        "username": username, "email": email, "password": "pass1234", "role": "user",
    }, headers=admin_headers)

    uid_val = next(
        u["id"] for u in client.get("/api/users", headers=admin_headers).json()
        if u["email"] == email
    )
    client.patch(f"/api/users/{uid_val}", json={"is_active": False}, headers=admin_headers)

    r = client.post("/api/auth/login", json={"email": email, "password": "pass1234"})
    assert r.status_code == 403
    assert "deactivated" in r.json()["detail"].lower()


def test_new_user_can_login(client, admin_headers):
    email = f"login_{uid()}@test.com"
    client.post("/api/users", json={
        "username": f"login_{uid()}", "email": email,
        "password": "mypassword", "role": "user",
    }, headers=admin_headers)
    r = client.post("/api/auth/login", json={"email": email, "password": "mypassword"})
    assert r.status_code == 200
    assert "user" in r.json()
