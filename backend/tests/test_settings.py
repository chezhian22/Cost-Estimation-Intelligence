def test_get_company_settings_admin(client, admin_headers):
    r = client.get("/api/settings/company", headers=admin_headers)
    assert r.status_code == 200
    body = r.json()
    assert "company_name" in body
    assert "country" in body


def test_get_company_settings_no_auth_returns_401(client):
    r = client.get("/api/settings/company")
    assert r.status_code == 401


def test_update_company_name(client, admin_headers):
    r = client.patch("/api/settings/company", json={"company_name": "Test Print Ltd"},
                     headers=admin_headers)
    assert r.status_code == 200
    assert r.json()["company_name"] == "Test Print Ltd"


def test_update_tagline_and_gst(client, admin_headers):
    r = client.patch("/api/settings/company", json={
        "tagline": "Quality Labels",
        "gst_number": "29ABCDE1234F1Z5",
    }, headers=admin_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["tagline"] == "Quality Labels"
    assert body["gst_number"] == "29ABCDE1234F1Z5"


def test_update_tax_rates(client, admin_headers):
    r = client.patch("/api/settings/company", json={"cgst_pct": 9.0, "sgst_pct": 9.0},
                     headers=admin_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["cgst_pct"] == 9.0
    assert body["sgst_pct"] == 9.0


def test_update_address_fields(client, admin_headers):
    r = client.patch("/api/settings/company", json={
        "address": "123 MG Road",
        "location": "Bengaluru",
        "state": "Karnataka",
        "country": "India",
        "website": "https://example.com",
    }, headers=admin_headers)
    assert r.status_code == 200
    body = r.json()
    assert body["address"] == "123 MG Road"
    assert body["state"] == "Karnataka"
    assert body["website"] == "https://example.com"


def test_update_settings_no_auth_returns_401(client):
    r = client.patch("/api/settings/company", json={"company_name": "Hacked"})
    assert r.status_code == 401


def test_partial_update_preserves_other_fields(client, admin_headers):
    # Set two fields
    client.patch("/api/settings/company", json={
        "company_name": "Chromaprint", "state": "Tamil Nadu",
    }, headers=admin_headers)

    # Update only the name — state should still be there
    client.patch("/api/settings/company", json={"company_name": "New Name"},
                 headers=admin_headers)
    r = client.get("/api/settings/company", headers=admin_headers)
    body = r.json()
    assert body["company_name"] == "New Name"
    assert body["state"] == "Tamil Nadu"


def test_settings_updated_at_is_set_after_patch(client, admin_headers):
    r = client.patch("/api/settings/company", json={"company_name": "Time Test"},
                     headers=admin_headers)
    assert r.status_code == 200
    assert r.json()["updated_at"] is not None


def test_get_settings_returns_default_when_empty(client, admin_headers):
    # clean_tables already wiped settings; get should auto-create with defaults
    r = client.get("/api/settings/company", headers=admin_headers)
    assert r.status_code == 200
    # Should have some value for company_name (the model default)
    assert r.json()["company_name"] is not None
