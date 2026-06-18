# Technology Stack — Chroma Print Cost Estimation Intelligence

A full-stack label printing cost estimator built with a Python backend and React frontend.

---

## Table of Contents

1. [Backend](#backend)
   - [Python](#python)
   - [FastAPI](#fastapi)
   - [SQLAlchemy](#sqlalchemy)
   - [MySQL + PyMySQL](#mysql--pymysql)
   - [Pydantic](#pydantic)
   - [python-jose (JWT)](#python-jose-jwt)
   - [bcrypt](#bcrypt)
   - [fpdf2](#fpdf2)
   - [Uvicorn](#uvicorn)
   - [python-dotenv](#python-dotenv)
   - [asyncio (Background Tasks)](#asyncio-background-tasks)
   - [imaplib / smtplib](#imaplib--smtplib)
   - [python-multipart](#python-multipart)
2. [Frontend](#frontend)
   - [React 18](#react-18)
   - [Vite](#vite)
   - [react-router-dom v7](#react-router-dom-v7)
   - [Recharts](#recharts)
   - [jsPDF + jspdf-autotable](#jspdf--jspdf-autotable)
   - [xlsx](#xlsx)
   - [Custom CSS Design System](#custom-css-design-system)
3. [Security Patterns](#security-patterns)
4. [What Could Be Improved](#what-could-be-improved)

---

## Backend

### Python

**Version:** 3.11+

**Description:**  
Python is the language the entire backend is written in. It handles API routing, business logic (cylinder cost calculations), database access, PDF generation, and background monitoring tasks.

**Why used:**  
Python has an unmatched ecosystem for rapid backend development. Libraries for web APIs, ORMs, PDF generation, email, and cryptography all exist as mature, well-documented packages. The calculation-heavy nature of this app (label area, yield percentages, pricing formulas) is easy to express clearly in Python.

**Pros:**
- Readable, concise syntax — calculation logic reads almost like a formula
- Enormous package ecosystem (PyPI)
- Async support via `asyncio` for background tasks without extra threads
- Fast prototyping — new features can be added quickly

**Alternatives:**
| Alternative | Verdict |
|---|---|
| **Node.js (TypeScript)** | Would unify frontend/backend language. Good for I/O-heavy apps but less natural for math-heavy calculation logic. |
| **Go** | Excellent performance and deployment simplicity (single binary). Steeper learning curve; less ecosystem for rapid domain logic. |
| **Java / Spring Boot** | Enterprise-grade, great tooling. Overkill in verbosity for a focused internal tool. |

---

### FastAPI

**Version:** ≥ 0.115

**Description:**  
FastAPI is the web framework that handles HTTP routing, dependency injection, request validation, and OpenAPI documentation. Every API endpoint (`/api/calculate`, `/api/clients`, `/api/notifications`, etc.) is defined here.

**Why used:**  
FastAPI generates automatic OpenAPI (Swagger) docs from type hints, which made building and testing the API faster. Its dependency injection system cleanly handles authentication (`get_current_user`, `require_admin`) and database sessions without boilerplate.

**Pros:**
- Automatic `/docs` Swagger UI — no separate API documentation needed
- Dependency injection for auth and DB sessions is clean and testable
- Pydantic integration means request/response validation is built-in
- Async-first — background tasks like `notification_monitor_loop` run natively
- One of the fastest Python web frameworks (benchmarked near Go for I/O)

**Alternatives:**
| Alternative | Verdict |
|---|---|
| **Django + DRF** | More batteries included (admin panel, ORM). More opinionated — harder to keep lean for an API-only backend. |
| **Flask** | Simpler, more flexible. No built-in validation or auto-docs — you'd wire those separately. |
| **Litestar** | FastAPI-inspired, slightly faster. Smaller community and ecosystem than FastAPI. |

---

### SQLAlchemy

**Version:** ≥ 2.0

**Description:**  
SQLAlchemy is the ORM (Object-Relational Mapper) used throughout the backend. Every database table (`users`, `clients`, `orders`, `calculations`, `notifications`, etc.) is defined as a Python class in `models.py`. Queries, inserts, and updates are written in Python rather than raw SQL.

**Why used:**  
SQLAlchemy keeps database logic in Python objects rather than scattered SQL strings, making the code portable and readable. Its session system integrates cleanly with FastAPI's dependency injection. The `create_all` call at startup automatically creates missing tables.

**Pros:**
- Models are Python classes — easy to understand and refactor
- Parameterised queries by default — SQL injection through the ORM is essentially impossible
- Relationships (`client.orders`, `notification.read_by`) are navigable as attributes
- Works with MySQL, PostgreSQL, SQLite — can switch databases with one config change
- `create_all` handles schema bootstrapping; `_migrate()` handles incremental column additions

**Alternatives:**
| Alternative | Verdict |
|---|---|
| **Raw SQL (pymysql)** | Faster for simple queries. But no safety net — SQL injection risk rises, refactoring is harder. |
| **Peewee** | Lightweight ORM, simpler API. Less powerful for complex queries and relationships. |
| **Tortoise ORM** | Async-native ORM, pairs well with FastAPI. Less mature, smaller community than SQLAlchemy. |
| **Prisma (Python client)** | Type-safe, excellent DX. Still early-stage for Python. |

---

### MySQL + PyMySQL

**Description:**  
MySQL is the relational database storing all application data. PyMySQL is the pure-Python driver that SQLAlchemy uses to connect to it.

**Why used:**  
MySQL is a well-understood, production-proven relational database. The data in this app — clients, orders, calculations, substrates — is structured and relational by nature. PyMySQL was chosen over the C-extension `mysqlclient` because it installs cleanly on any OS without native dependencies.

**Pros:**
- Structured data model fits perfectly (clients → orders → calculations)
- ACID transactions protect quote status changes
- Wide hosting support (any shared host, AWS RDS, PlanetScale, etc.)
- PyMySQL requires no C compiler — easy setup on Windows

**Alternatives:**
| Alternative | Verdict |
|---|---|
| **PostgreSQL** | More advanced features (JSONB, full-text search, window functions). Better choice if scaling up. Slightly harder to self-host on Windows. |
| **SQLite** | Zero-setup, file-based. Good for development. Not suitable for multi-user production access. |
| **MongoDB** | Document store — flexible schema. Overkill and less natural for this relational data. |

---

### Pydantic

**Version:** ≥ 2.12

**Description:**  
Pydantic is the data validation library that powers FastAPI's request and response schemas. Every API body (`CalculationRequest`, `ClientCreate`, `StatusUpdate`, etc.) is a Pydantic model defined in `schemas.py`.

**Why used:**  
Pydantic validates incoming data automatically — type coercion, range checks (`gt=0`, `le=100`), and required/optional fields are declared once and enforced everywhere. Invalid requests are rejected with clear error messages before they ever reach business logic.

**Pros:**
- Validation failures return structured 422 errors automatically — no manual checks
- Type hints serve double duty as runtime validators and IDE autocomplete
- Generates OpenAPI schemas — Swagger docs stay in sync with code
- V2 (used here) is significantly faster than V1

**Alternatives:**
| Alternative | Verdict |
|---|---|
| **Marshmallow** | Mature serialisation library. More verbose than Pydantic, no automatic OpenAPI integration. |
| **Cerberus** | Simple dict validation. No type-hint integration, no OpenAPI. |
| **attrs + cattrs** | Excellent for typed data. Less FastAPI-native, more manual wiring. |

---

### python-jose (JWT)

**Version:** ≥ 3.3

**Description:**  
`python-jose` creates and verifies JSON Web Tokens (JWTs). On login, a signed token containing `user_id`, `username`, and `role` is generated and set as an HttpOnly cookie. Every subsequent request verifies the token to identify the user.

**Why used:**  
JWTs allow stateless authentication — the server doesn't store sessions in a database or cache. The token carries the user's identity and role, so `get_current_user` and `require_admin` work purely from the token without a DB lookup on every check.

**Pros:**
- Stateless — no session table needed
- Token contains role (`admin`/`user`) — role checks are instant
- 8-hour expiry is enforced inside the token itself
- HttpOnly cookie delivery means JavaScript cannot access the token (XSS protection)

**Alternatives:**
| Alternative | Verdict |
|---|---|
| **PyJWT** | Simpler, widely used. Would work equally well here. |
| **Server-side sessions (Redis)** | Easier to revoke sessions immediately. Requires Redis infrastructure. Better for high-security apps. |
| **OAuth2 / Auth0** | Delegates auth entirely. Adds third-party dependency but production-hardened. |

---

### bcrypt

**Version:** ≥ 4.0

**Description:**  
bcrypt hashes user passwords before storing them in the database. A SHA-256 pre-hash step normalises the password to 43 bytes before bcrypt's 72-byte limit, so long passwords are handled correctly.

**Why used:**  
bcrypt is the industry standard for password hashing. It is intentionally slow (work factor), making brute-force attacks expensive. Even if the database is compromised, raw passwords cannot be recovered.

**Pros:**
- Work factor is adjustable — can be increased as hardware gets faster
- Built-in salt per hash — identical passwords produce different hashes
- SHA-256 pre-hash correctly handles passwords longer than 72 characters

**Alternatives:**
| Alternative | Verdict |
|---|---|
| **Argon2 (argon2-cffi)** | Winner of the Password Hashing Competition. More memory-hard than bcrypt. Slightly better choice for new projects. |
| **scrypt** | Memory-hard, built into Python's stdlib. Less widely deployed than bcrypt. |
| **PBKDF2** | Acceptable, used by Django. Less GPU-resistant than bcrypt or Argon2. |

---

### fpdf2

**Version:** ≥ 2.7

**Description:**  
fpdf2 generates invoice PDF files server-side in Python. When a user requests an email with an invoice, the backend generates a PDF binary and attaches it — no browser required.

**Why used:**  
Needed to generate PDFs on the server so they can be attached to emails without requiring the user's browser. fpdf2 is pure Python with no external dependencies.

**Pros:**
- Pure Python — no system dependencies (no Chromium, LibreOffice, etc.)
- Lightweight and fast for structured documents
- Full control over layout, fonts, colours, and positioning

**Cons / Limitations (why we also have a browser PDF):**
- Only supports Latin-1 characters natively — Unicode symbols like ₹ or — must be replaced with ASCII equivalents (`Rs.`, `-`)
- Manual layout — no HTML/CSS rendering
- For pixel-perfect PDFs matching a web design, browser-based rendering (below) is better

**Alternatives:**
| Alternative | Verdict |
|---|---|
| **WeasyPrint** | Renders HTML/CSS to PDF. Would let the email PDF match the browser preview exactly. Requires system libraries. |
| **Playwright / Puppeteer (headless Chrome)** | Perfect fidelity — renders the actual web page. Heavy (full browser), but produces the best result. |
| **ReportLab** | Powerful, commercial-grade. More complex API than fpdf2 for simple invoices. |

---

### Uvicorn

**Version:** ≥ 0.32 (standard extras)

**Description:**  
Uvicorn is the ASGI server that runs the FastAPI application. It handles HTTP connections, worker processes, and serves the app in both development and production.

**Why used:**  
FastAPI requires an ASGI server. Uvicorn is the standard choice — it's fast, lightweight, and officially recommended by FastAPI.

**Pros:**
- Full async support — background tasks run alongside HTTP handlers
- `--reload` for development hot-reloads without restarting
- `[standard]` extras include `uvloop` (faster event loop on Linux) and `httptools`

**Alternatives:**
| Alternative | Verdict |
|---|---|
| **Gunicorn + Uvicorn workers** | Standard for production — Gunicorn manages multiple Uvicorn workers for multi-core use. Recommended for production deployments. |
| **Hypercorn** | Another ASGI server, supports HTTP/2. Slightly less common than Uvicorn. |
| **Daphne** | Django Channels' ASGI server. No advantage for a FastAPI app. |

---

### python-dotenv

**Description:**  
Loads environment variables from a `.env` file into `os.environ` at startup. The database URL, secret key, and SMTP credentials are read from environment variables rather than being hardcoded.

**Why used:**  
Keeps secrets out of source code. The same codebase can point to a dev database or production database by swapping `.env` files.

**Pros:**
- Zero-config secret management for local development
- Works transparently with Docker and CI environments (they set env vars natively)

**Alternatives:**
| Alternative | Verdict |
|---|---|
| **Pydantic Settings** | Reads env vars into typed Pydantic models — better validation and IDE support. Upgrade worth considering. |
| **HashiCorp Vault / AWS Secrets Manager** | Production-grade secret management. Necessary at scale; overkill for an internal tool. |

---

### asyncio (Background Tasks)

**Description:**  
Python's built-in `asyncio` library powers two background monitoring loops:
- **`notification_monitor_loop`** — checks every 60 seconds for orders with no confirmed quotation and raises in-app notifications.
- **`bounce_monitor_loop`** — checks every 5 minutes for email bounce NDRs via IMAP and auto-marks failed emails in the log.

Both loops are started at app startup with `asyncio.create_task()`.

**Why used:**  
FastAPI runs on an async event loop. Running background jobs as `asyncio` tasks lets them coexist with HTTP request handling on the same thread — no separate process, queue, or worker needed.

**Pros:**
- No extra infrastructure — no Redis, no Celery, no separate worker process
- Tasks start when the app starts and stop when it stops
- Cooperative multitasking — `await asyncio.sleep()` yields to the event loop between checks

**Alternatives:**
| Alternative | Verdict |
|---|---|
| **Celery + Redis** | Production-grade task queue. Supports retries, scheduling, distributed workers. Necessary at scale. |
| **APScheduler** | Cron-like scheduling within the Python process. Easier to manage than raw asyncio loops. |
| **FastAPI BackgroundTasks** | For per-request fire-and-forget tasks. Not suitable for recurring background jobs. |

---

### imaplib / smtplib

**Description:**  
Python's standard-library email modules. `smtplib` sends invoice emails via the configured SMTP server (Gmail, etc.). `imaplib` reads the inbox to detect bounce NDR emails and auto-mark failed deliveries.

**Why used:**  
Both are in the Python standard library — zero extra dependencies. They cover the two directions of email: outbound (invoices) and inbound (bounce detection).

**Pros:**
- No third-party email dependency
- Full control over MIME message construction for HTML + PDF attachments
- Bounce detection is a rare feature — building it directly avoids a paid service

**Alternatives:**
| Alternative | Verdict |
|---|---|
| **SendGrid / Mailgun API** | Managed email delivery with built-in bounce webhooks. More reliable for high volume. Adds external dependency and cost. |
| **aiosmtplib** | Async SMTP client — would fit better in the async FastAPI context than the blocking `smtplib`. Worth upgrading. |
| **Resend** | Modern developer-friendly email API. Easiest to integrate; no SMTP config needed. |

---

### python-multipart

**Description:**  
Enables FastAPI to parse `multipart/form-data` requests — used for the company logo upload endpoint.

**Why used:**  
Required by FastAPI to handle file uploads (`UploadFile`). Without it, the logo upload endpoint would fail.

**Pros:**
- Required peer dependency for FastAPI file uploads
- No configuration needed

---

## Frontend

### React 18

**Description:**  
React is the JavaScript UI library that powers the entire frontend. Every page — calculator, quote history, client orders, admin pages, notification bell — is a React component. State is managed with `useState`/`useEffect` hooks.

**Why used:**  
React's component model maps naturally to this app's structure (panels, tables, modals, forms). The hook-based state management handles complex UI flows like the estimating wizard, quote confirmation flow, and real-time notification polling cleanly.

**Pros:**
- Component reuse — `CylinderTable`, `PricingPanel`, `NotificationBell` are shared across views
- `useEffect` for polling (notification count every 60 s) is straightforward
- React Portals used for the notification dropdown (renders outside the sidebar DOM tree)
- Huge ecosystem — recharts, react-router-dom, jsPDF all have React integrations
- Virtual DOM diffing keeps large tables (quote history) performant

**Alternatives:**
| Alternative | Verdict |
|---|---|
| **Vue 3** | Gentler learning curve, excellent DX with Composition API. Smaller ecosystem than React. |
| **SvelteKit** | Compiles away the framework — smallest bundle, fastest runtime. Less hiring pool, fewer libraries. |
| **Next.js (React SSR)** | Server-side rendering for SEO and faster initial load. Overkill for an internal tool behind a login. |
| **Angular** | Full framework with opinionated structure. Better for large enterprise teams. Verbose for a focused internal app. |

---

### Vite

**Description:**  
Vite is the frontend build tool and development server. It serves the React app in development with instant hot-module replacement (HMR) and bundles it for production.

**Why used:**  
Vite starts in milliseconds compared to Webpack-based setups. In development, changes appear in the browser instantly without a full rebuild.

**Pros:**
- Near-instant dev server startup (no full bundle on start)
- HMR updates individual modules without losing component state
- Native ES modules in development — no transpilation overhead during iteration
- `VITE_API_BASE` env variable cleanly proxies API calls to the FastAPI backend

**Alternatives:**
| Alternative | Verdict |
|---|---|
| **Create React App (Webpack)** | The old default. Slow startup, slow rebuilds. No longer recommended. |
| **Parcel** | Zero-config bundler. Good but less widely used and less optimised than Vite. |
| **Turbopack (Next.js)** | Very fast. Tied to Next.js — not suitable for a plain React SPA. |

---

### react-router-dom v7

**Description:**  
Handles client-side navigation. Each section of the app (`/calculator`, `/history`, `/admin/catalogue`, `/admin/notifications`) maps to a React component. The browser URL updates without a full page reload.

**Why used:**  
A single-page app with multiple distinct views needs client-side routing. react-router-dom is the standard for React apps. The `useLocation` and `useNavigate` hooks let the app derive the active view from the URL, making links and browser back/forward work correctly.

**Pros:**
- Deep-linking works — users can bookmark `/admin/notifications` directly
- `useLocation` + `PATH_TO_VIEW` map converts URL → active view cleanly
- v7 is the latest with improved data loading APIs

**Alternatives:**
| Alternative | Verdict |
|---|---|
| **TanStack Router** | Type-safe routing, excellent DX. Newer; smaller community than react-router. |
| **Wouter** | 1.3 KB micro-router. Fine for simple apps; fewer features than react-router. |
| **Next.js file-based routing** | Automatic routing from file structure. Requires migrating to Next.js. |

---

### Recharts

**Version:** ≥ 3.8

**Description:**  
Recharts renders the data visualisation charts on the Dashboard — quote status breakdowns, activity trends, client comparisons.

**Why used:**  
Recharts is a React-native charting library built on D3. It composes charts from React components, which integrates naturally with the rest of the codebase.

**Pros:**
- Pure React components — no imperative D3 manipulation
- Responsive containers adapt to any screen size
- Good selection of chart types (bar, line, pie, area) for the dashboard

**Alternatives:**
| Alternative | Verdict |
|---|---|
| **Chart.js + react-chartjs-2** | Widely used, good documentation. Canvas-based (not SVG) — less crisp on high-DPI screens. |
| **Victory** | Also React-native. Similar to Recharts; slightly less popular. |
| **Tremor / shadcn charts** | Pre-styled chart components. Faster to set up; less design control. |
| **Apache ECharts** | More powerful for complex visualisations. Heavier bundle. |

---

### jsPDF + jspdf-autotable

**Description:**  
jsPDF generates PDFs entirely in the browser (no server needed) for the Invoice Preview and Quotation download. `jspdf-autotable` handles the multi-row pricing table inside the PDF.

**Why used:**  
The browser-side PDF uses the actual calculated data and mirrors the UI preview exactly. Since it runs in the browser, it can use the full Unicode character set (₹ symbol, em-dash) that the server-side fpdf2 cannot handle.

**Pros:**
- Fully client-side — no server round-trip for PDF generation
- Supports Unicode fonts — ₹ and other symbols render correctly
- `autotable` plugin handles complex tables with column alignment automatically
- Can open in a new tab (iframe) or trigger a direct download

**Alternatives:**
| Alternative | Verdict |
|---|---|
| **html2canvas + jsPDF** | Screenshots the DOM as a canvas then embeds as an image. Low quality text — not selectable/searchable. |
| **Puppeteer (server-side)** | Headless Chrome renders HTML perfectly. Requires server infrastructure but gives pixel-perfect output. |
| **React-PDF (pdf-lib)** | Declarative PDF layout in React. Excellent quality; steeper API to learn. |
| **pdfmake** | Data-driven PDF layout. Good for structured documents; less flexible for custom designs. |

---

### xlsx

**Version:** ≥ 0.18

**Description:**  
The `xlsx` library (SheetJS) exports quote history data to `.xlsx` Excel files directly from the browser.

**Why used:**  
Finance and operations teams often need data in Excel. SheetJS converts a JavaScript array of objects into a downloadable spreadsheet with no server call.

**Pros:**
- Client-side — no server needed for export
- Supports `.xlsx`, `.csv`, and other formats from the same API
- Zero dependency on Excel or any Office software

**Alternatives:**
| Alternative | Verdict |
|---|---|
| **ExcelJS** | More control over cell styling (colours, borders). Larger bundle. |
| **Papa Parse (CSV only)** | Tiny library for CSV export. Simpler, but no formatting or multi-sheet support. |
| **Server-side export (openpyxl)** | Python library for Excel. Moves work to the server — better for very large datasets. |

---

### Custom CSS Design System

**Description:**  
The entire UI is styled with hand-written CSS using CSS custom properties (variables). There is no CSS framework (no Tailwind, no Bootstrap). The design system defines tokens for colours, spacing, radius, and shadows, with full dark/light theme support via `data-theme` on the root element.

Key tokens: `--teal`, `--bg-page`, `--bg-card`, `--bg-raised`, `--text-bright`, `--text-dim`, `--border`, `--border-faint`, `--radius`.

**Why used:**  
Full control over every visual detail without fighting a framework's opinions. The dark-first design with the teal accent colour required a custom look that would have needed heavy overrides in any utility framework.

**Pros:**
- Zero runtime overhead — no JS-in-CSS, no class-name generation
- Theme switching is instant (`data-theme` toggle + CSS variable reassignment)
- No framework version to upgrade or breaking changes to absorb
- Consistent design tokens across 30+ components

**Alternatives:**
| Alternative | Verdict |
|---|---|
| **Tailwind CSS** | Utility-first, very fast to build with. Would reduce CSS file size. Loses some fine-grained control over animations and complex states. |
| **shadcn/ui + Tailwind** | Pre-built accessible components. Fastest path to a polished UI. Would require migrating existing components. |
| **CSS Modules** | Scoped CSS per component — prevents class name collisions. Could be adopted incrementally alongside the current approach. |
| **Styled Components / Emotion** | CSS-in-JS with component scoping. Adds runtime overhead; better for highly dynamic styles. |

---

## Security Patterns

### HttpOnly Cookie Auth
JWT tokens are stored in HttpOnly cookies (not `localStorage`). JavaScript cannot read them, blocking XSS token theft.

### SQL Injection — Two-Layer Defence
1. **SQLAlchemy ORM** — all values are parameterised automatically.
2. **`security.py` middleware** — scans every incoming JSON body for 14 known injection patterns (UNION SELECT, OR tautologies, stacked statements, time-based blind injection, etc.) and rejects with HTTP 400 before any logic runs.

### Password Hashing
bcrypt with SHA-256 pre-hashing. Passwords are never stored in plain text.

### Role-Based Access
`require_admin` dependency on FastAPI routes. Admin-only routes (user management, catalogue, notification management, company settings) are enforced at the API level, not just the frontend nav.

---

## What Could Be Improved

| Area | Current | Better Alternative | Reason |
|---|---|---|---|
| **Email sending** | Blocking `smtplib` | `aiosmtplib` (async) | Sending emails currently blocks the async event loop |
| **Background jobs** | Raw `asyncio` loops | **APScheduler** or **Celery** | Easier scheduling, retry on failure, job history |
| **Password hashing** | bcrypt | **Argon2** (`argon2-cffi`) | More memory-hard, winner of PHC |
| **Server-side PDF** | fpdf2 (Latin-1 only) | **WeasyPrint** | HTML/CSS → PDF with full Unicode, matches browser preview |
| **Settings secrets** | `python-dotenv` | **Pydantic Settings** | Typed env vars with validation |
| **Database** | MySQL | **PostgreSQL** | Better JSON support, window functions, stricter standards |
| **Frontend state** | `useState` + prop drilling | **Zustand** or **TanStack Query** | Global state (currentUser, substrates, unread count) is passed deeply; a lightweight store would simplify this |
| **API client** | Manual `fetch` in `api.js` | **TanStack Query** | Caching, background refetch, loading/error states built-in |
| **CSS** | Single large `styles.css` (3000+ lines) | **CSS Modules** or **Tailwind** | Scoped styles, smaller per-component files, easier to maintain |
| **Auth** | Custom JWT | **Better Auth** or **Auth.js** | Production-hardened, handles refresh tokens and session revocation |
| **File uploads** | Base64 logo in DB column | **S3 / local disk** | Base64 in a DB column is inefficient for large images |
| **Testing** | `pytest` + `httpx` (backend only) | Add **Vitest** + **React Testing Library** | Frontend has no automated tests |
