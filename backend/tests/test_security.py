"""
Tests for SQL injection detection and the request-level guard middleware.
"""
import pytest
from app.security import scan_value, sanitise_str, scan_json


# ── scan_value ────────────────────────────────────────────────────────────────

class TestScanValue:
    # ---- should be DETECTED ----
    def test_detects_quote_comment(self):
        assert scan_value("admin'--") != []

    def test_detects_quote_semicolon(self):
        assert scan_value("x'; DROP TABLE users") != []

    def test_detects_union_select(self):
        assert scan_value("' UNION SELECT username,password FROM users--") != []

    def test_detects_or_tautology(self):
        assert scan_value("' OR 1=1--") != []
        assert scan_value("' OR 'a'='a") != []

    def test_detects_and_tautology(self):
        assert scan_value("1' AND 1=1--") != []

    def test_detects_stacked_drop(self):
        assert scan_value("x'; DROP TABLE orders;--") != []

    def test_detects_block_comment(self):
        assert scan_value("SE/**/LECT * FROM users") != []

    def test_detects_xp_procedure(self):
        assert scan_value("'; EXEC xp_cmdshell('dir')--") != []

    def test_detects_exec_call(self):
        assert scan_value("'; EXECUTE('SELECT 1')--") != []

    def test_detects_information_schema(self):
        assert scan_value("' UNION SELECT table_name FROM INFORMATION_SCHEMA.TABLES--") != []

    def test_detects_hex_payload(self):
        assert scan_value("0x53454c454354") != []

    def test_detects_trailing_comment(self):
        assert scan_value("admin'  --") != []

    def test_detects_sleep_blind_injection(self):
        assert scan_value("'; SLEEP(5)--") != []

    def test_detects_benchmark_blind(self):
        assert scan_value("' OR BENCHMARK(5000000,MD5(1))--") != []

    def test_detects_load_file(self):
        assert scan_value("' UNION SELECT LOAD_FILE('/etc/passwd')--") != []

    def test_detects_into_outfile(self):
        assert scan_value("' INTO OUTFILE '/tmp/shell.php'--") != []

    # ---- should NOT trigger false positives ----
    def test_allows_normal_company_name(self):
        assert scan_value("Kingfisher Breweries Pvt Ltd") == []

    def test_allows_hyphen_in_name(self):
        assert scan_value("Coca-Cola India") == []

    def test_allows_apostrophe_in_name(self):
        assert scan_value("O'Brien Packaging") == []

    def test_allows_select_as_word_in_name(self):
        assert scan_value("SELECT Beverages") == []

    def test_allows_email_address(self):
        assert scan_value("contact@example.com") == []

    def test_allows_address_with_numbers(self):
        assert scan_value("123 MG Road, Bengaluru 560001") == []

    def test_allows_gst_number(self):
        assert scan_value("29ABCDE1234F1Z5") == []

    def test_allows_phone_number(self):
        assert scan_value("+91 98765 43210") == []

    def test_allows_url(self):
        assert scan_value("https://chromaprint.in") == []

    def test_empty_string_is_clean(self):
        assert scan_value("") == []

    def test_returns_pattern_names(self):
        hits = scan_value("' UNION SELECT 1--")
        assert any("UNION" in h.upper() for h in hits)


# ── sanitise_str ──────────────────────────────────────────────────────────────

class TestSanitiseStr:
    def test_strips_null_byte(self):
        assert "\x00" not in sanitise_str("hello\x00world")

    def test_strips_control_chars(self):
        dirty = "abc\x01\x02\x03def"
        assert sanitise_str(dirty) == "abcdef"

    def test_preserves_newline_and_tab(self):
        s = "line1\nline2\ttabbed"
        assert sanitise_str(s) == s

    def test_preserves_normal_unicode(self):
        s = "Chroma Print — ₹ labels"
        assert sanitise_str(s) == s

    def test_clean_string_unchanged(self):
        s = "PP Gloss 45.0 ₹/m²"
        assert sanitise_str(s) == s


# ── scan_json ────────────────────────────────────────────────────────────────

class TestScanJson:
    def test_finds_injection_in_nested_dict(self):
        data = {"user": {"name": "' OR 1=1--", "email": "ok@test.com"}}
        hits = scan_json(data)
        assert any("name" in path for path, _ in hits)

    def test_finds_injection_in_list(self):
        data = {"items": ["clean", "' UNION SELECT 1--"]}
        hits = scan_json(data)
        assert len(hits) >= 1
        assert all("items[1]" in path for path, _ in hits)

    def test_clean_payload_returns_empty(self):
        data = {"name": "Kingfisher", "price": 45.0, "save": True}
        assert scan_json(data) == []

    def test_numbers_and_booleans_ignored(self):
        data = {"count": 99, "active": True, "ratio": 1.5}
        assert scan_json(data) == []


# ── middleware integration ────────────────────────────────────────────────────

class TestSqlInjectionMiddleware:
    def test_normal_client_creation_passes(self, client):
        r = client.post("/api/clients", json={"name": "O'Brien Packaging"})
        # Apostrophe alone is fine — not followed by comment/SQL keyword
        assert r.status_code == 201

    def test_injection_in_client_name_rejected(self, client):
        r = client.post("/api/clients", json={"name": "' OR 1=1--"})
        assert r.status_code == 400
        body = r.json()
        assert "patterns" in body
        assert "detail" in body

    def test_union_select_rejected(self, client):
        r = client.post("/api/clients", json={"name": "x' UNION SELECT * FROM users--"})
        assert r.status_code == 400

    def test_stacked_drop_rejected(self, client):
        r = client.post("/api/clients", json={"name": "x'; DROP TABLE clients;--"})
        assert r.status_code == 400

    def test_injection_in_substrate_name_rejected(self, client):
        r = client.post("/api/substrates", json={
            "name": "PP'; DELETE FROM substrates;--",
            "price": 45.0,
        })
        assert r.status_code == 400

    def test_injection_in_username_rejected(self, client, admin_headers):
        r = client.post("/api/users", json={
            "username": "' OR '1'='1",
            "email": "safe@test.com",
            "password": "pass1234",
            "role": "user",
        }, headers=admin_headers)
        assert r.status_code == 400

    def test_get_requests_not_scanned(self, client):
        # GET has no body; middleware must not interfere
        r = client.get("/api/clients")
        assert r.status_code == 200

    def test_health_endpoint_unaffected(self, client):
        r = client.get("/api/health")
        assert r.status_code == 200

    def test_normal_calculation_request_passes(self, client):
        client.post("/api/teeth", json={"teeth": 64, "paper_size": 520})
        r = client.post("/api/calculate", json={
            "width": 64.5, "height": 136, "yield_pct": 85,
            "substrate_price": 45.0, "foil_cost": 0.0,
            "exchange_rate": 85.0, "save": False,
        })
        assert r.status_code == 200

    def test_response_body_names_patterns(self, client):
        r = client.post("/api/clients", json={"name": "' UNION SELECT 1--"})
        assert r.status_code == 400
        assert isinstance(r.json()["patterns"], list)
        assert len(r.json()["patterns"]) > 0

    def test_injection_in_nested_order_name_rejected(self, client):
        # Create a real client first so we can test order creation
        cr = client.post("/api/clients", json={"name": "Safe Client"})
        cid = cr.json()["id"]
        r = client.post(f"/api/clients/{cid}/orders", json={
            "name": "'; DROP TABLE orders;--",
        })
        assert r.status_code == 400
