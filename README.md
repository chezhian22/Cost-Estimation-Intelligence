# Cylinder Calculator — Full-Stack

Label-costing tool built as a three-tier application:

- **Frontend** — React (Vite) — `http://localhost:5173`
- **Backend** — FastAPI (Python) — `http://localhost:8000`
- **Database** — MySQL 8 (via SQLAlchemy + PyMySQL)

---

## Project structure

```
cylinder-calculator/
├── backend/
│   ├── requirements.txt
│   ├── .env.example
│   └── app/
│       ├── main.py           API routes
│       ├── calculator.py     core formula engine
│       ├── auth.py           JWT + password hashing
│       ├── database.py       SQLAlchemy engine / session
│       ├── models.py         ORM tables
│       ├── schemas.py        Pydantic schemas
│       ├── crud.py           DB helpers
│       ├── seed.py           reference data (cylinders + substrates)
│       └── seed_customers.py sample clients & orders
├── frontend/
│   ├── package.json
│   └── src/
│       ├── App.jsx
│       ├── api.js
│       ├── utils/
│       │   └── generatePDF.js   PDF quote export
│       └── components/
│           ├── Dashboard.jsx
│           ├── LoginPage.jsx
│           ├── UserManagementPage.jsx
│           ├── CustomerOrdersPage.jsx
│           ├── QuoteHistory.jsx
│           ├── CylinderTable.jsx
│           ├── PricingPanel.jsx
│           ├── InputPanel.jsx
│           └── ClientOrderSelector.jsx
├── docker-compose.yml        local MySQL container
└── README.md
```

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 18 + |
| Python | 3.10 + |
| Docker Desktop | any recent |

---

## Step 1 — Start the database

```bash
docker compose up -d
```

This starts MySQL 8 on `localhost:3306` with:
- Database: `cylinder_db`
- User: `root`
- Password: `password`

Wait a few seconds for MySQL to be ready before moving on.

> **No Docker?** Create a MySQL database manually and set `DATABASE_URL` in `backend/.env` (see step 2).

---

## Step 2 — Backend setup

```bash
cd backend
```

**Create and activate a virtual environment:**

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS / Linux
python -m venv venv
source venv/bin/activate
```

**Install dependencies:**

```bash
pip install -r requirements.txt
```

**Create a `.env` file** (copy from `.env.example` and fill in your values):

```bash
cp .env.example .env
# then edit .env with your DATABASE_URL and SECRET_KEY
```

Example `.env`:
```
DATABASE_URL=mysql+pymysql://root:password@localhost:3306/cost-estimation-intelligence
SECRET_KEY=your-random-secret-key-here
```

**Create tables and seed reference data:**

```bash
# Cylinder teeth rows + substrates (required)
python -m app.seed

# Sample clients & orders (optional)
python -m app.seed_customers
```

**Start the API server:**

```bash
uvicorn app.main:app --reload --port 8000
```

API docs available at <http://localhost:8000/docs>.

---

## Step 3 — Frontend setup

Open a new terminal:

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173> in your browser.

Vite proxies `/api` requests to the backend on port 8000 automatically — no extra CORS config needed in development.

---

## Running everything (quick reference)

| Terminal | Command |
|----------|---------|
| 1 | `docker compose up -d` |
| 2 | `cd backend && venv\Scripts\activate && uvicorn app.main:app --reload --port 8000` |
| 3 | `cd frontend && npm run dev` |

---

## Production build

```bash
cd frontend
npm run build
```

Output is in `frontend/dist/`. Set `VITE_API_BASE` if the backend is on a different origin:

```bash
VITE_API_BASE=https://api.example.com npm run build
```

---

## API reference

**Auth**

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/auth/login` | Login — returns JWT token |
| GET | `/api/auth/me` | Current user info |

**Users (admin only)**

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/users` | List all users |
| POST | `/api/users` | Create a user |
| PATCH | `/api/users/{id}` | Update a user |
| DELETE | `/api/users/{id}` | Delete a user |

**Calculator**

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Health check |
| POST | `/api/calculate` | Run a calculation (`save: true` to persist) |
| GET | `/api/calculations` | List saved calculations |
| GET | `/api/calculations/{id}` | Fetch one saved calculation |
| PATCH | `/api/calculations/{id}/status` | Update quote status |
| PATCH | `/api/calculations/{id}/cylinder` | Update selected cylinder |
| GET | `/api/calculations/{id}/versions` | List edit versions |
| POST | `/api/calculations/{id}/versions` | Save an edited version |
| PATCH | `/api/calculations/versions/{id}/status` | Update version status |

**Substrates & Cylinders**

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/substrates` | List substrates |
| POST | `/api/substrates` | Add a substrate |
| DELETE | `/api/substrates/{id}` | Delete a substrate |
| PATCH | `/api/substrates/{id}/availability` | Toggle availability |
| GET | `/api/teeth` | List cylinder teeth rows |
| POST | `/api/teeth` | Add a teeth row |
| DELETE | `/api/teeth/{id}` | Delete a teeth row |
| PATCH | `/api/teeth/{id}/availability` | Toggle availability |

**Clients & Orders**

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/clients` | List clients |
| POST | `/api/clients` | Create a client |
| PATCH | `/api/clients/{id}` | Update a client |
| GET | `/api/clients/{id}/orders` | List orders for a client |
| POST | `/api/clients/{id}/orders` | Create an order |
| GET | `/api/orders/{id}/calculations` | List calculations under an order |

---

## Notes

- **Authentication** — the app uses JWT. On first run, create an admin user via the seed script or directly in the database. All API routes that write data require a valid Bearer token.
- **Secret key** — set `SECRET_KEY` in `backend/.env` to a long random string before deploying. The fallback default is for development only.
- Reference data (teeth rows and substrates) lives in the database. Edit it via the Admin panel in the UI or directly via the API.
- `foil_cost` (₹/m²) is added to `substrate_price` before computing the per-label cost, so all rate tiers and final pricing reflect both material costs. Set it to 0 if no foil is used.
- The calculation logic matches the original Excel formulas — default inputs produce a best match of 63.5 × 146.67 mm at ₹986.118 / 1000 labels.
- **Edit versions** — any saved quote can be revised to create a new version. Approving a version is shown under the order in the Customers & Orders page.
