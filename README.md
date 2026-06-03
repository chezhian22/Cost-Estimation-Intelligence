# Cylinder Calculator — Full-Stack

Label-costing tool, rebuilt as a three-tier application:

- **Frontend** — React (Vite)
- **Backend** — FastAPI (Python)
- **Database** — MySQL (via SQLAlchemy + PyMySQL)

The calculation logic is a faithful port of the original Excel/JavaScript
formulas, so results are identical to the spreadsheet (e.g. default inputs give
a best match of 63.5 mm × 146.67 mm and ₹986.118 / 1000 labels).

```
cylinder-calculator/
├── backend/          FastAPI app
│   └── app/
│       ├── main.py         routes
│       ├── calculator.py   core formula engine
│       ├── database.py     SQLAlchemy engine/session
│       ├── models.py       ORM tables
│       ├── schemas.py      Pydantic models
│       ├── crud.py         DB helpers
│       └── seed.py         loads reference data
├── frontend/         React app (Vite)
│   └── src/
│       ├── App.jsx
│       ├── api.js
│       └── components/
├── docker-compose.yml   local MySQL
└── README.md
```

## 1. Database

The quickest path is the bundled Docker MySQL:

```bash
docker compose up -d
```

This starts MySQL 8 on `localhost:3306` with database `cylinder_db`,
user `root`, password `password`.

> Already have MySQL? Just create a database and set `DATABASE_URL`
> (see `backend/.env.example`).

## 2. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

# Point at your DB (matches the docker-compose defaults)
export DATABASE_URL="mysql+pymysql://root:password@localhost:3306/cylinder_db"

# Create tables and load the reference data (substrates + teeth)
python -m app.seed

# Run the API
uvicorn app.main:app --reload --port 8000
```

API docs are then available at <http://localhost:8000/docs>.

## 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173>. Vite proxies `/api` to the backend on port 8000,
so no extra CORS config is needed in development.

For a production build: `npm run build` (output in `frontend/dist/`). Set
`VITE_API_BASE` if the backend is served from a different origin.

## API summary

| Method | Path                     | Purpose                              |
|--------|--------------------------|--------------------------------------|
| GET    | `/api/health`            | health check                         |
| GET    | `/api/substrates`        | list substrates                      |
| POST   | `/api/substrates`        | add a substrate                      |
| GET    | `/api/teeth`             | list teeth/paper reference rows      |
| POST   | `/api/teeth`             | add a teeth/paper row                |
| POST   | `/api/calculate`         | run a calculation (`save: true` to persist) |
| GET    | `/api/calculations`      | list saved calculations (history)    |
| GET    | `/api/calculations/{id}` | fetch one saved calculation          |

## Notes

- Reference data (the 11 teeth/paper rows and 15 substrates) now lives in the
  database instead of being hard-coded in the browser. Edit it via the
  `POST` endpoints or directly in MySQL.
- `foil_cost` is accepted and stored but, matching the original sheet, is not
  added into the per-label cost. Adjust `calculator.py` if you want it folded in.
