# 🖥️ MediFlow AI — Local Setup Guide

This guide walks you through running the **entire MediFlow AI project on your own
machine** — both the React frontend and the FastAPI backend.

> **Before you start — one important thing to know:**
> Pushing code to GitHub does **not** host or run your app. GitHub only stores the
> source code. Every person who wants to run MediFlow clones the repo and runs
> their **own local copy** of the frontend and backend on *their* machine. That's
> exactly what this guide lets you (or anyone else) do. There is no shared,
> internet-accessible API endpoint yet — that requires deployment (see the
> [FAQ](#-faq) at the bottom).

---

## 🧩 What you're running

| Piece | What it is | How you run it | URL after start |
|-------|-----------|----------------|-----------------|
| **Frontend** | React + Vite app (repo root) | `npm run dev` | http://localhost:3000 |
| **Backend** | FastAPI (Python) REST API (`backend/`) | uvicorn | http://localhost:8000 |
| **Database** | PostgreSQL | your local PostgreSQL service | localhost:5432 |

> The frontend is **optional to pair with the backend**. It runs mostly on
> built-in mock data + external map providers (Geoapify / LocationIQ), so it can
> be opened on its own. The backend is a separate, self-contained REST API with
> its own tests. You can run one, the other, or both.

---

## 📋 Prerequisites

Install these **once** on your machine:

- **Node.js** `v18+` — https://nodejs.org/
- **npm** `v9+` (comes with Node.js)
- **Git** — https://git-scm.com/
- **Python** `3.10+` — https://www.python.org/
- **PostgreSQL** — https://www.postgresql.org/download/ (needed only for the backend)

Verify what's installed:

```bash
node --version
npm --version
git --version
python --version
```

---

## 1️⃣ Get the code

```bash
git clone https://github.com/gagan-dk/mediflow-ai.git
cd mediflow-ai
```

---

## 2️⃣ Run the FRONTEND (React app)

### a) Install dependencies

```bash
npm install
```

### b) Create your local map-config file

The frontend's map features (hospital finder, routing) call the **Geoapify**
map API. You need a key for those features to work.

1. Copy the template:

   ```bash
   cp .env.example .env.local        # macOS / Linux
   # or on Windows (PowerShell):
   Copy-Item .env.example .env.local
   ```

2. Open `.env.local` and add a real Geoapify key:

   ```dotenv
   VITE_GEOAPIFY_API_KEY=YOUR_GEOAPIFY_KEY_HERE
   ```

   > Get a **free** key at https://www.geoapify.com/ (create an account → API keys).
   > The app also supports a LocationIQ key (`VITE_LOCATIONIQ_API_KEY`) as a fallback,
   > but Geoapify alone is enough to start.

   > `.env.local` is gitignored, so your key never gets committed — and each person
   > who clones the repo must create their own copy with their **own** key.

### c) Start the dev server

```bash
npm run dev
```

Open your browser at **http://localhost:3000** — the app hot-reloads on changes. 🔥

> ⚠️ Note: this project's dev server is configured (in `vite.config.ts`) to use
> **port 3000**, not the Vite default 5173.

**Available scripts:**

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build production bundle into `dist/` |
| `npm run preview` | Preview the production build locally |

---

## 3️⃣ Run the BACKEND (FastAPI API)

This is optional but required if you want the REST API running. It needs
**PostgreSQL**.

### a) Create a PostgreSQL database

Open a PostgreSQL prompt / tool (e.g. pgAdmin, or `psql`) and create a database
and user for the app (or use your existing local setup):

```sql
CREATE USER mediflow WITH PASSWORD 'mediflow';
CREATE DATABASE mediflow OWNER mediflow;
```

### b) Create the backend `.env` file

From the `backend/` folder, copy the template:

```powershell
cd backend
Copy-Item .env.example .env
```

Then edit `backend/.env` so `DATABASE_URL` points at your database and set a
strong secret key:

```dotenv
DEBUG=false
DATABASE_URL=postgresql+psycopg://mediflow:mediflow@localhost:5432/mediflow
SECRET_KEY=some-long-random-string-change-me
ACCESS_TOKEN_EXPIRE_MINUTES=480
```

> Adjust the username/password/host/port if your local PostgreSQL differs.
> `.env` is gitignored — never commit it.

### c) Set up a Python virtual environment and install dependencies

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\activate          # Windows PowerShell
# source .venv/bin/activate       # macOS / Linux
pip install -r requirements.txt
```

### d) Apply the database schema (migrations)

```powershell
.\.venv\Scripts\python.exe -m alembic upgrade head
```

### e) Seed the demo data (optional but recommended)

This loads the frontend's operational demo records (hospitals, doctors, beds,
ambulances, demo users) into the database:

```powershell
$env:DEBUG="true"                  # allows the dev-only demo passwords
.\.venv\Scripts\python.exe -m app.seed.seed_database
```

> See [`backend/SEEDING.md`](backend/SEEDING.md) for full details and the demo
> login credentials.

### f) Start the API server

```powershell
.\.venv\Scripts\uvicorn.exe app.main:app --reload
```

Once running:

- **API base:** http://localhost:8000
- **Interactive API docs (Swagger):** http://localhost:8000/docs
- **Health check:** http://localhost:8000/api/health

### g) (Optional) Run the backend test suite

```powershell
.\.venv\Scripts\python.exe -m pytest tests -q
```

The tests use an ephemeral SQLite database, so they don't require PostgreSQL.

---

## 🧪 Demo login credentials

After seeding with `DEBUG=true`, these accounts work against
`POST /api/auth/login`:

| Email | Password | Role |
|-------|----------|------|
| patient@mediflow.ai | patient123 | Patient |
| staff@mediflow.ai | staff123 | Hospital staff |
| admin@mediflow.ai | admin123 | Admin |

> These are **development-only** defaults. In a real (non-debug) environment you
> must supply passwords via `MEDIFLOW_SEED_PASSWORD` / `MEDIFLOW_SEED_ADMIN_PASSWORD`.

---

## 🔁 Troubleshooting

| Symptom | Likely cause / fix |
|---------|--------------------|
| Map / hospital finder shows errors | `.env.local` missing or `VITE_GEOAPIFY_API_KEY` empty. Add a real Geoapify key and restart `npm run dev`. |
| Port 3000 already in use | Something else is on 3000. Stop it, or change `server.port` in `vite.config.ts`. |
| Backend won't connect to DB | PostgreSQL not running, or `DATABASE_URL` in `backend/.env` is wrong. Check the service is up and credentials match. |
| `SECRET_KEY` error on backend start | Set a non-default `SECRET_KEY` in `backend/.env` when `DEBUG=false`. |
| `npm install` slow / errors | Check Node version is 18+. Delete `node_modules/` and `package-lock.json`, then reinstall. |

---

## ❓ FAQ

**Q: Does MediFlow run "only on my system"?**
A: No — it runs on **any** machine that clones the repo and follows this guide.
But it's **not hosted on a public server**, so there's no public URL yet.

**Q: Can someone else use the same API endpoint?**
A: They can run the **same code** as their own local API on *their* `localhost:8000`.
It is **not** one shared endpoint — each person runs their own instance.
`localhost` always means "this machine."

**Q: How do I make it public / reachable from other devices?**
A: You have to **deploy** it to cloud hosting, e.g.:
- Frontend → Vercel / Netlify
- Backend API → Render / Railway / Fly.io
- Database → a hosted PostgreSQL (Neon / Supabase / RDS)

That gives the API a real public URL that any device can call. GitHub alone
doesn't do this.
