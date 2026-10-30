# Department Digital Hub

A public department website plus a private admin dashboard for maintaining all of its content:
faculty, students, achievements, events, opportunities, placements, research, labs, projects, alumni,
news and gallery. Content lives in a database; nothing is hard-coded in the website.

```
Admin dashboard ──► FastAPI (validation, auth, audit) ──► Database (SQLite / PostgreSQL)
                                                       └─► Cloudinary (images & PDFs)
Public website (Next.js) ◄── reads PUBLISHED content from the same API
```

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, React Hook Form + Zod, Recharts (`frontend/`)
- **Backend**: FastAPI, SQLAlchemy 2, Pydantic 2, Alembic, pandas/openpyxl (`backend/`)
- **Storage**: Cloudinary (local `backend/media/` folder when Cloudinary is not configured, for development only)

Design decisions and the module plan are in [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md).

---

## 1. Local setup (Windows, macOS, Linux)

Requirements: **Python 3.12+** and **Node.js 20+**. No Docker and no database server needed: development uses a SQLite file.

### Backend

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate      macOS/Linux: source .venv/bin/activate
pip install -r requirements-dev.txt

cp .env.example .env            # Windows: copy .env.example .env
# set JWT_SECRET in .env, e.g. the output of:
python -c "import secrets; print(secrets.token_urlsafe(48))"

alembic upgrade head                                    # create the database tables
python -m scripts.create_admin --email you@college.edu --name "Your Name" --superadmin
python -m scripts.seed_dev                              # optional: clearly-labelled SAMPLE content
uvicorn app.main:app --reload --port 8000
```

API docs (development only): http://127.0.0.1:8000/api/docs

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local      # API_URL=http://127.0.0.1:8000
npm run dev
```

- Website: http://localhost:3000
- Admin: http://localhost:3000/admin (sign in with the account you created)

### Using PostgreSQL locally (this project's current setup)

The development database is a PostgreSQL 16 server owned by your Windows user (no admin rights needed),
with its data in `.pgdata/` (git-ignored), listening on `localhost:5434`. The app connects as the `dept_hub` login
configured in `backend/.env`. Start everything with:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\start-dev.ps1   # PostgreSQL + backend + frontend
powershell -ExecutionPolicy Bypass -File scripts\stop-db.ps1     # stop PostgreSQL
```

To move existing data from a SQLite file into an empty PostgreSQL database:
`alembic upgrade head` then `python -m scripts.copy_sqlite_to_postgres --sqlite dept_hub.db`.

The browser only ever talks to the Next.js server; `/api/v1/*` and `/media/*` are forwarded to FastAPI,
so the admin session cookie stays first-party and HTTP-only.

---

## 2. Configuration

### `backend/.env`

| Variable | Purpose |
|----------|---------|
| `ENV` | `development`, `test` or `production` |
| `DATABASE_URL` | Default: SQLite file `backend/dept_hub.db`. Production: `postgresql+psycopg://USER:PASSWORD@HOST:5432/dept_hub` |
| `JWT_SECRET` | **Required.** Random string ≥ 32 characters. Changing it signs everyone out. |
| `JWT_EXPIRE_MINUTES` | Admin session length (default 480) |
| `COOKIE_SECURE` | `true` in production (HTTPS only cookies) |
| `CLOUDINARY_URL` | `cloudinary://API_KEY:API_SECRET@CLOUD_NAME` (Cloudinary dashboard → API Keys). Required in production. |
| `CLOUDINARY_FOLDER` | Folder prefix inside Cloudinary (default `dept-hub`) |

In production the backend refuses to start without a strong `JWT_SECRET`, `CLOUDINARY_URL` and `COOKIE_SECURE=true`.

### `frontend/.env.local`

| Variable | Purpose |
|----------|---------|
| `API_URL` | Internal URL of the backend (server-side only; never sent to browsers) |
| `SITE_URL` | Public URL of the website (sitemap, canonical and social-sharing links) |

No secrets live in the frontend.

---

## 3. Using the admin dashboard

- **Publishing**: every record is `Draft` (hidden), `Published` (visible) or `Archived` (hidden, kept for history).
  Changes appear on the website immediately.
- **Delete vs archive**: the list's archive button hides a record but keeps it. Permanent deletion needs an explicit
  confirmation (select rows → Delete).
- **Uploads**: images (JPG/PNG/WEBP/GIF ≤ 5 MB) and PDFs (≤ 10 MB) are type-checked and stored in Cloudinary;
  Cloudinary serves optimised, resized versions automatically.
- **Excel import** (Admin → Excel Import): download the template, fill it, upload. The preview shows
  *new / updated / unchanged / invalid / duplicate* rows with reasons; **nothing is written until you confirm**.
  Records are matched by a natural key (e.g. register number for students, email for faculty, DOI for publications).
  Columns missing from your sheet are left untouched on existing records.
- **Excel export** (Admin → Excel Export): pick records and optional filters. Exports use the template columns, so
  they can be edited and re-imported.
- **Activity logs**: every sign-in, change, import, export and upload is recorded.
- **Admins**: super-admins can add or deactivate administrators (Admin → Settings). There are no default accounts.
- **Privacy**: student contact details, photos and register numbers are hidden publicly unless the matching
  switch is enabled on the student record. Phone numbers are never shown.

Templates available: students, faculty, student_achievements, faculty_achievements, events, opportunities,
placements, publications, projects, alumni.

---

## 4. Production deployment

1. **Database**: create a PostgreSQL 14+ database and set `DATABASE_URL`. Run `alembic upgrade head`
   on every deployment (it is safe to repeat).
2. **Backend**: set `ENV=production`, `COOKIE_SECURE=true`, a strong `JWT_SECRET` and `CLOUDINARY_URL`, then run e.g.
   `uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 2` under systemd, NSSM (Windows) or a PaaS process manager.
   Create the first admin with `python -m scripts.create_admin … --superadmin`.
   > Login rate limiting is kept in memory per process. With several workers, each one counts separately;
   > run one worker or put a shared limiter (e.g. Redis) in front if that matters.
3. **Frontend**: `npm ci && npm run build && npm run start -- -p 3000` with `API_URL` pointing at the backend and
   `SITE_URL` set to the public address.
4. **HTTPS**: put both behind a reverse proxy (Nginx, Caddy, IIS) that serves **only the Next.js app** publicly and
   terminates TLS. The backend does not need to be exposed to the internet.
5. Do **not** run `scripts.seed_dev` in production (it refuses when `ENV=production`).

## 5. Backups

The database is the system of record; Excel exports are **not** a backup.

```bash
cd backend
python -m scripts.backup --dir /var/backups/dept-hub --keep 14
```

- SQLite: consistent online copy. PostgreSQL: `pg_dump` custom format (restore with `pg_restore -d dept_hub FILE.dump`).
- Schedule it daily (cron: `0 2 * * * cd /srv/dept-hub/backend && .venv/bin/python -m scripts.backup --dir /var/backups/dept-hub`,
  or Windows Task Scheduler) and copy the folder off-site.
- Admin → Settings shows when the last successful backup ran.
- Uploaded files live in Cloudinary; enable Cloudinary's backup option or periodically export the media library.

---

## 6. Tests

```bash
# Backend: auth, CSRF, rate limiting, authorization, CRUD, publishing, privacy, validation, Excel, uploads, search
cd backend && pytest -q
# Against PostgreSQL (runs the migrations on that database first):
TEST_DATABASE_URL=postgresql+psycopg://user:pass@localhost:5432/dept_hub_test pytest -q

# Frontend: static checks
cd frontend && npm run lint && npm run typecheck

# End-to-end (Playwright): starts an isolated backend (fresh DB + sample data) on :8001 and a
# production build on :3001, then tests public browsing, filters, admin login, CRUD, Excel import/export
# and mobile layout.
cd frontend && npx playwright install chromium && npm run test:e2e
```

CI (`.github/workflows/ci.yml`) runs the backend suite on SQLite and PostgreSQL, plus lint, typecheck and E2E.

---

## 7. Project structure

```
backend/
  app/
    core/        settings, password hashing + JWT, login rate limiter
    db/          engine/session, base classes (timestamps, created_by/updated_by, status)
    models/      SQLAlchemy models
    schemas/     Pydantic schemas (modules.py) and controlled vocabularies (options.py)
    crud/        generic resource framework: one declaration -> public + admin endpoints
    resources.py declarations of all content modules (filters, search fields, ordering)
    api/v1/      auth, department, site (home/search/summaries), admin (uploads/stats/logs), excel
    services/    audit log, Cloudinary/local storage, Excel import/export
  alembic/       migrations
  scripts/       create_admin, seed_dev, backup, e2e_server
  tests/
frontend/
  src/app/(public)/   public pages (server-rendered from the API)
  src/app/admin/      login + dashboard (client-side, authenticated API calls)
  src/components/     site/ (public UI), admin/ (generic table, form, uploads), ui/ (shadcn)
  src/lib/            API clients, types, formatting, admin module configs
  e2e/                Playwright tests
```

### Adding a field or a module

1. Add the column to the model in `backend/app/models/` and create a migration:
   `alembic revision --autogenerate -m "add X"` then `alembic upgrade head`.
2. Add the field to the `…In` schema in `backend/app/schemas/modules.py`.
3. For a new module, add a `Resource(...)` entry in `backend/app/resources.py`. This gives you the public and admin endpoints.
4. Add the field (or module) to `frontend/src/lib/admin/resources.ts`. The admin table and form are generated from it.
5. Show it on the relevant public page, add tests.
