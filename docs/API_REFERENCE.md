# Cylinder Calculator — API Reference

**Chroma Print India Pvt Ltd**  
Base URL (dev): `http://localhost:8000`  
Interactive docs: `http://localhost:8000/docs`  
All requests and responses use `Content-Type: application/json`.

---

## Table of Contents

1. [Health](#1-health)
2. [Clients](#2-clients)
   - [List Clients](#21-list-clients)
   - [Create Client](#22-create-client)
3. [Orders](#3-orders)
   - [List Orders](#31-list-orders-for-a-client)
   - [Create Order](#32-create-order)
   - [Get Order Calculations](#33-get-calculations-under-an-order)
4. [Substrates](#4-substrates)
   - [List Substrates](#41-list-substrates)
   - [Add Substrate](#42-add-substrate)
   - [Delete Substrate](#43-delete-substrate)
5. [Cylinders](#5-cylinders)
   - [List Cylinders](#51-list-cylinders)
   - [Add Cylinder](#52-add-cylinder)
   - [Delete Cylinder](#53-delete-cylinder)
6. [Calculate](#6-calculate)
7. [History](#7-history)
   - [List All Saved Calculations](#71-list-all-saved-calculations)
   - [Get Single Calculation](#72-get-single-calculation)

---

## 1. Health

### `GET /api/health`

Check if the API server is running.

**Response `200`**
```json
{
  "status": "ok"
}
```

---

## 2. Clients

### 2.1 List Clients

#### `GET /api/clients`

Returns all clients sorted A→Z. Use this to populate the client dropdown in the UI.

**Response `200`**
```json
[
  {
    "id": 1,
    "name": "Arun Packaging",
    "created_at": "2025-01-10T09:30:00"
  },
  {
    "id": 2,
    "name": "Kingfisher Breweries",
    "created_at": "2025-01-12T11:00:00"
  },
  {
    "id": 3,
    "name": "Nilgiris Dairy Farm",
    "created_at": "2025-02-03T14:20:00"
  }
]
```

---

### 2.2 Create Client

#### `POST /api/clients`

Creates a new client. Name must be unique.

**Request Body**
```json
{
  "name": "Kingfisher Breweries"
}
```

**Response `201`**
```json
{
  "id": 2,
  "name": "Kingfisher Breweries",
  "created_at": "2025-01-12T11:00:00"
}
```

**Error `409`** — name already exists
```json
{
  "detail": "Client name already exists"
}
```

---

## 3. Orders

### 3.1 List Orders for a Client

#### `GET /api/clients/{client_id}/orders`

Returns all orders under a client, newest first.

**Path Parameter**

| Name | Type | Description |
|---|---|---|
| `client_id` | integer | ID from `GET /api/clients` |

**Example:** `GET /api/clients/2/orders`

**Response `200`**
```json
[
  {
    "id": 5,
    "name": "Order #3",
    "client_id": 2,
    "created_at": "2025-03-20T10:00:00"
  },
  {
    "id": 3,
    "name": "Order #2",
    "client_id": 2,
    "created_at": "2025-02-14T08:45:00"
  },
  {
    "id": 1,
    "name": "Order #1",
    "client_id": 2,
    "created_at": "2025-01-12T11:05:00"
  }
]
```

**Error `404`** — client not found
```json
{
  "detail": "Client not found"
}
```

---

### 3.2 Create Order

#### `POST /api/clients/{client_id}/orders`

Creates a new order under the client.  
The frontend auto-generates the name as `Order #N` (existing count + 1) — no user input needed.

**Path Parameter**

| Name | Type | Description |
|---|---|---|
| `client_id` | integer | ID from `GET /api/clients` |

**Request Body**
```json
{
  "name": "Order #3"
}
```

**Response `201`**
```json
{
  "id": 5,
  "name": "Order #3",
  "client_id": 2,
  "created_at": "2025-03-20T10:00:00"
}
```

---

### 3.3 Get Calculations Under an Order

#### `GET /api/orders/{order_id}/calculations`

Returns all saved calculations grouped under a specific order, newest first.  
Each item includes the `pricing` summary so the UI can display a table without extra calls.

**Path Parameter**

| Name | Type | Description |
|---|---|---|
| `order_id` | integer | ID from `GET /api/clients/{id}/orders` |

**Example:** `GET /api/orders/5/calculations`

**Response `200`**
```json
[
  {
    "id": 18,
    "width": 64.5,
    "height": 136.0,
    "waste_pct": 85.0,
    "substrate_name": "PP Gloss",
    "substrate_price": 45.0,
    "foil_cost": 0.0,
    "exchange_rate": 85.0,
    "created_at": "2025-03-20T10:05:00",
    "pricing": {
      "label_w_cm": 6.773,
      "label_h_cm": 13.617,
      "labels_sqm": 80.54,
      "adj_labels": 68.46,
      "rate_15": 984.52,
      "rate_175": 1148.60,
      "rate_2": 1312.69,
      "price_inr_label": 0.9842,
      "price_inr_1000": 984.52,
      "price_usd_label": 0.01158,
      "price_usd_1000": 11.583
    }
  },
  {
    "id": 17,
    "width": 80.0,
    "height": 120.0,
    "waste_pct": 85.0,
    "substrate_name": "PP Gloss",
    "substrate_price": 45.0,
    "foil_cost": 5.0,
    "exchange_rate": 85.0,
    "created_at": "2025-03-20T09:50:00",
    "pricing": {
      "label_w_cm": 8.127,
      "label_h_cm": 12.084,
      "labels_sqm": 76.30,
      "adj_labels": 64.86,
      "rate_15": 1174.40,
      "rate_175": 1370.13,
      "rate_2": 1565.87,
      "price_inr_label": 1.1744,
      "price_inr_1000": 1174.40,
      "price_usd_label": 0.01382,
      "price_usd_1000": 13.816
    }
  }
]
```

---

## 4. Substrates

### 4.1 List Substrates

#### `GET /api/substrates`

Returns all substrate materials. Use this to populate the substrate dropdown in the calculator.

**Response `200`**
```json
[
  { "id": 1,  "name": "Bopp",                    "price": 38.0 },
  { "id": 2,  "name": "Bopp Matt",               "price": 40.0 },
  { "id": 3,  "name": "PP Gloss",                "price": 45.0 },
  { "id": 4,  "name": "PP Matt",                 "price": 45.0 },
  { "id": 5,  "name": "PET Transparent",         "price": 55.0 },
  { "id": 6,  "name": "PET Silver Metalized",    "price": 65.0 },
  { "id": 7,  "name": "PET Gold Metalized",      "price": 65.0 },
  { "id": 8,  "name": "Thermal Paper 80gsm",     "price": 28.0 },
  { "id": 9,  "name": "Art Paper 90gsm",         "price": 22.0 },
  { "id": 10, "name": "Kraft Paper",             "price": 18.0 }
]
```

---

### 4.2 Add Substrate

#### `POST /api/substrates`

**Request Body**
```json
{
  "name": "PE White Opaque",
  "price": 52.0
}
```

**Response `201`**
```json
{
  "id": 11,
  "name": "PE White Opaque",
  "price": 52.0
}
```

---

### 4.3 Delete Substrate

#### `DELETE /api/substrates/{substrate_id}`

**Example:** `DELETE /api/substrates/11`

**Response `204`** — No Content (empty body)

**Error `404`**
```json
{
  "detail": "Substrate not found"
}
```

---

## 5. Cylinders

### 5.1 List Cylinders

#### `GET /api/teeth`

Returns the full cylinder reference table sorted by teeth count.  
Each cylinder's **circumference** = `teeth × 3.175` mm.

**Response `200`**
```json
[
  { "id": 1,  "teeth": 47,  "paper_size": 380 },
  { "id": 2,  "teeth": 52,  "paper_size": 420 },
  { "id": 3,  "teeth": 56,  "paper_size": 457 },
  { "id": 4,  "teeth": 60,  "paper_size": 457 },
  { "id": 5,  "teeth": 64,  "paper_size": 520 },
  { "id": 6,  "teeth": 68,  "paper_size": 520 },
  { "id": 7,  "teeth": 72,  "paper_size": 520 },
  { "id": 8,  "teeth": 80,  "paper_size": 600 },
  { "id": 9,  "teeth": 88,  "paper_size": 600 },
  { "id": 10, "teeth": 96,  "paper_size": 700 },
  { "id": 11, "teeth": 112, "paper_size": 700 }
]
```

---

### 5.2 Add Cylinder

#### `POST /api/teeth`

**Request Body**
```json
{
  "teeth": 104,
  "paper_size": 700
}
```

**Response `201`**
```json
{
  "id": 12,
  "teeth": 104,
  "paper_size": 700
}
```

---

### 5.3 Delete Cylinder

#### `DELETE /api/teeth/{teeth_id}`

**Example:** `DELETE /api/teeth/12`

**Response `204`** — No Content (empty body)

**Error `404`**
```json
{
  "detail": "Cylinder not found"
}
```

---

## 6. Calculate

### `POST /api/calculate`

**The core endpoint.** Computes label packing and pricing across all cylinders and returns the best match.

---

### Request Body — fields explained

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `width` | float | yes | — | Label width in mm (runs *around* the cylinder) |
| `height` | float | yes | — | Label height in mm (runs *across* the web) |
| `waste_pct` | float | yes | — | Web utilisation % — typically `85` |
| `substrate_name` | string | no | `null` | Name stored in history (use value from substrates list) |
| `substrate_price` | float | yes | — | ₹ per m² |
| `foil_cost` | float | no | `0` | Extra ₹ per m² for foil/lamination |
| `exchange_rate` | float | yes | — | ₹ per USD (e.g. `85`) |
| `save` | boolean | no | `false` | `true` = persist to history |
| `client_id` | integer | no | `null` | Required only when `save: true` |
| `order_id` | integer | no | `null` | Required only when `save: true` |

---

### Example 1 — Preview (not saved)

**Request**
```json
{
  "width": 64.5,
  "height": 136.0,
  "waste_pct": 85,
  "substrate_name": "PP Gloss",
  "substrate_price": 45.0,
  "foil_cost": 0.0,
  "exchange_rate": 85.0,
  "save": false
}
```

**Response `200`**
```json
{
  "rows": [
    {
      "teeth": 47,
      "circumference": 149.225,
      "input_width": 64.5,
      "around": 2,
      "label_width": 74.613,
      "paper_size": 380,
      "paper_plus_20": 456,
      "input_height": 136.0,
      "across": 2,
      "label_height": 190.0
    },
    {
      "teeth": 52,
      "circumference": 165.1,
      "input_width": 64.5,
      "around": 2,
      "label_width": 82.55,
      "paper_size": 420,
      "paper_plus_20": 504,
      "input_height": 136.0,
      "across": 3,
      "label_height": 140.0
    },
    {
      "teeth": 64,
      "circumference": 203.2,
      "input_width": 64.5,
      "around": 3,
      "label_width": 67.733,
      "paper_size": 520,
      "paper_plus_20": 624,
      "input_height": 136.0,
      "across": 3,
      "label_height": 173.333
    },
    {
      "teeth": 72,
      "circumference": 228.6,
      "input_width": 64.5,
      "around": 3,
      "label_width": 76.2,
      "paper_size": 520,
      "paper_plus_20": 624,
      "input_height": 136.0,
      "across": 3,
      "label_height": 173.333
    }
  ],
  "matched": {
    "index": 2,
    "best_paper_index": 2,
    "matched_width": 67.733,
    "matched_height": 136.0,
    "matched_teeth": 64
  },
  "pricing": {
    "label_w_cm": 6.773,
    "label_h_cm": 13.6,
    "labels_sqm": 80.54,
    "adj_labels": 68.46,
    "rate_15": 984.52,
    "rate_175": 1148.60,
    "rate_2": 1312.69,
    "price_inr_label": 0.9845,
    "price_inr_1000": 984.52,
    "price_usd_label": 0.01158,
    "price_usd_1000": 11.583
  },
  "calculation_id": null
}
```

> **Note:** `rows` is truncated above — the real response contains one entry per cylinder in the reference table. `matched.index` points to the best row in that array.

---

### Example 2 — Save to an order

**Request**
```json
{
  "width": 64.5,
  "height": 136.0,
  "waste_pct": 85,
  "substrate_name": "PP Gloss",
  "substrate_price": 45.0,
  "foil_cost": 0.0,
  "exchange_rate": 85.0,
  "save": true,
  "client_id": 2,
  "order_id": 5
}
```

**Response `200`** — same structure as above, but `calculation_id` is now set:
```json
{
  "rows": [ "... same as above ..." ],
  "matched": { "... same as above ..." },
  "pricing": { "... same as above ..." },
  "calculation_id": 18
}
```

---

### Example 3 — With foil cost

**Request**
```json
{
  "width": 80.0,
  "height": 120.0,
  "waste_pct": 85,
  "substrate_name": "PET Gold Metalized",
  "substrate_price": 65.0,
  "foil_cost": 12.0,
  "exchange_rate": 85.0,
  "save": false
}
```

**Response `200` — pricing section**
```json
{
  "pricing": {
    "label_w_cm": 8.127,
    "label_h_cm": 12.084,
    "labels_sqm": 76.30,
    "adj_labels": 64.86,
    "rate_15": 1782.30,
    "rate_175": 2079.35,
    "rate_2": 2376.40,
    "price_inr_label": 1.7823,
    "price_inr_1000": 1782.30,
    "price_usd_label": 0.02097,
    "price_usd_1000": 20.968
  },
  "calculation_id": null
}
```

**Error `400`** — cylinder table is empty
```json
{
  "detail": "No teeth/paper reference data found. Run the seed script first."
}
```

---

## 7. History

### 7.1 List All Saved Calculations

#### `GET /api/calculations`

Returns up to 50 most recent saved calculations across all clients/orders.  
Includes denormalised `client_name` and `order_name` for direct display.

**Response `200`**
```json
[
  {
    "id": 18,
    "width": 64.5,
    "height": 136.0,
    "waste_pct": 85.0,
    "substrate_name": "PP Gloss",
    "substrate_price": 45.0,
    "foil_cost": 0.0,
    "exchange_rate": 85.0,
    "created_at": "2025-03-20T10:05:00",
    "client_id": 2,
    "order_id": 5,
    "client_name": "Kingfisher Breweries",
    "order_name": "Order #3"
  },
  {
    "id": 17,
    "width": 80.0,
    "height": 120.0,
    "waste_pct": 85.0,
    "substrate_name": "PP Gloss",
    "substrate_price": 45.0,
    "foil_cost": 5.0,
    "exchange_rate": 85.0,
    "created_at": "2025-03-20T09:50:00",
    "client_id": 2,
    "order_id": 5,
    "client_name": "Kingfisher Breweries",
    "order_name": "Order #3"
  },
  {
    "id": 12,
    "width": 50.0,
    "height": 80.0,
    "waste_pct": 80.0,
    "substrate_name": "Art Paper 90gsm",
    "substrate_price": 22.0,
    "foil_cost": 0.0,
    "exchange_rate": 85.0,
    "created_at": "2025-02-14T09:00:00",
    "client_id": 1,
    "order_id": 2,
    "client_name": "Arun Packaging",
    "order_name": "Order #2"
  }
]
```

---

### 7.2 Get Single Calculation

#### `GET /api/calculations/{calc_id}`

Returns the full record including the complete `result` JSON (all rows + matched + pricing).  
Use this to replay or display a historical result in detail.

**Example:** `GET /api/calculations/18`

**Response `200`**
```json
{
  "id": 18,
  "width": 64.5,
  "height": 136.0,
  "waste_pct": 85.0,
  "substrate_name": "PP Gloss",
  "substrate_price": 45.0,
  "foil_cost": 0.0,
  "exchange_rate": 85.0,
  "created_at": "2025-03-20T10:05:00",
  "client_id": 2,
  "order_id": 5,
  "result": {
    "rows": [
      {
        "teeth": 64,
        "circumference": 203.2,
        "input_width": 64.5,
        "around": 3,
        "label_width": 67.733,
        "paper_size": 520,
        "paper_plus_20": 624,
        "input_height": 136.0,
        "across": 3,
        "label_height": 173.333
      }
    ],
    "matched": {
      "index": 2,
      "best_paper_index": 2,
      "matched_width": 67.733,
      "matched_height": 136.0,
      "matched_teeth": 64
    },
    "pricing": {
      "label_w_cm": 6.773,
      "label_h_cm": 13.6,
      "labels_sqm": 80.54,
      "adj_labels": 68.46,
      "rate_15": 984.52,
      "rate_175": 1148.60,
      "rate_2": 1312.69,
      "price_inr_label": 0.9845,
      "price_inr_1000": 984.52,
      "price_usd_label": 0.01158,
      "price_usd_1000": 11.583
    }
  }
}
```

**Error `404`**
```json
{
  "detail": "Calculation not found"
}
```

---

## HTTP Status Code Summary

| Code | Meaning |
|---|---|
| `200` | Success — body contains the result |
| `201` | Created — a new record was persisted |
| `204` | Deleted — no response body |
| `400` | Bad request — missing reference data or invalid input |
| `404` | Not found — the requested ID does not exist |
| `409` | Conflict — a unique constraint was violated (e.g. duplicate client name) |
| `422` | Validation error — request body field is wrong type or out of range |

---

## Typical Frontend Workflow

```
1. App loads
   ├── GET /api/substrates     → populate substrate <select>
   ├── GET /api/clients        → populate client combobox
   └── GET /api/teeth          → (admin page only)

2. User selects a client
   └── GET /api/clients/{id}/orders  → populate order <select>

3. User fills in label dimensions and clicks "Run Calculation"
   └── POST /api/calculate  (save: false)
       → display rows table + pricing panel + orientation comparison

4. User selects an order and clicks "Run Calculation" again
   └── POST /api/calculate  (save: true, client_id, order_id)
       → same display + calculation_id is now set in response

5. User opens "Quote History" tab
   ├── GET /api/clients               → list clients (accordion)
   ├── GET /api/clients/{id}/orders   → list orders per client
   └── GET /api/orders/{id}/calculations → expand order to see saved calcs
```

---

*Document generated for Chroma Print India — Cylinder Cost Estimation System v1.0*
