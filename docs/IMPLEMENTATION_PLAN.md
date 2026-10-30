# Department Digital Hub — Implementation Plan

Status legend: `[ ]` not started · `[~]` in progress · `[x]` done and verified (tests pass)

---

## 1. Goals (summary)

A database-backed department website with:

- a **public site** (no login) that renders only `PUBLISHED` content from the API, and
- a **private admin CMS** (`/admin`) where authenticated administrators manage every module,
  import/export Excel, upload images/documents and review audit logs.

No department content is hard-coded in frontend components. All content flows
`Admin → Validation → PostgreSQL → FastAPI → Next.js → Public site`.

---

## 2. Architecture

```text
Browser ──► Next.js (App Router, SSR/ISR)  ──/api/v1/* rewrite──►  FastAPI  ──► PostgreSQL
                │                                                     │
                └── public pages: server-side fetch (revalidate)      └──► Cloudinary (images + documents)
                └── admin pages: client components, same-origin API calls with HTTP-only cookie
```

Repository layout:

```text
/backend            FastAPI service
  app/
    core/           config, security (hashing, JWT, CSRF), rate limiting
    db/             engine/session, declarative Base, mixins
    models/         SQLAlchemy models (one file per domain)
    schemas/        Pydantic schemas
    crud/           generic CRUD service + resource registry
    api/v1/         routers: auth, public, admin, uploads, excel, stats, search
    services/       storage (Cloudinary), audit log, excel import/export
  alembic/          migrations
  tests/            pytest suite (runs against a real PostgreSQL test DB)
  scripts/          create_admin.py, seed_dev.py
/frontend           Next.js 15 + TypeScript + Tailwind + shadcn/ui
  src/app/(public)/ public routes
  src/app/admin/    admin routes
  src/components/   ui (shadcn), public, admin
  src/lib/          api client, resource configs, zod schemas
  e2e/              Playwright tests
/docs               this plan, decisions

```

### Key design decisions

| # | Decision | Why |
|---|----------|-----|
| D1 | **Generic resource framework.** Each content module is declared once (model + schemas + filter/search config) and a router factory produces public list/detail and admin CRUD endpoints. The frontend mirrors this with a resource config driving a generic admin table + form. | ~20 modules share identical CRUD/publish/audit/pagination rules; avoids duplicated code and inconsistent behaviour. Modules with special needs add custom endpoints. |
| D2 | **Same-origin API via Next.js rewrites** (`/api/v1/* → backend`). | HTTP-only auth cookie stays first-party; no cross-site cookie/CORS fragility. |
| D3 | **Auth = JWT in HTTP-only, `SameSite=Lax`, `Secure` (prod) cookie** + **double-submit CSRF token** (`csrf_token` cookie mirrored in `X-CSRF-Token` header) required for all unsafe admin requests. | Spec §34. |
| D4 | **Argon2id** password hashing (`argon2-cffi`). | Spec §3. |
| D5 | **Login rate limiting**: per-IP + per-email sliding window (in-process). Documented: use Redis-backed limiter when running multiple backend replicas. | Spec §34; no extra infra for single-instance deploy. |
| D6 | **Cloudinary for all uploaded files** — images as `image` resources (auto format/quality transforms for optimisation), PDFs/docs as `raw` resources. DB stores only `secure_url` + `public_id`. A `local` storage driver exists for tests/dev without credentials. | User requirement; spec §3 "no large files in PostgreSQL". |
| D7 | **Publishing model**: content tables carry `status ∈ {DRAFT, PUBLISHED, ARCHIVED}`. People tables (faculty, students, alumni) use the same enum (ARCHIVED = inactive/left). Public API filters `status = PUBLISHED` always. Default "delete" = archive; hard delete is a separate, confirmed admin action. | Spec §27, §33. |
| D8 | **Student privacy**: students have `show_contact` / `show_photo` flags (default false); public schema never includes register number unless `show_register_no` setting is enabled, and never includes email/phone unless `show_contact`. | Spec §11, §35. |
| D9 | **Excel import is two-phase**: `POST /admin/excel/{entity}/preview` parses + validates and stores a server-side import session (DB table `import_sessions`, JSON payload, 30-min expiry); `POST /admin/excel/imports/{id}/commit` applies it in one transaction. Natural keys decide new/updated/unchanged/duplicate. | Spec §29: never overwrite directly. |
| D10 | **Search**: case-insensitive LIKE across key columns of each module, grouped results. | Spec §37 (simple, portable). |
| D11 | **Opportunities** require `source_url`, `registration_url`, `organizer`, `last_verified_at`; a `source` column (`MANUAL` now, ingest sources later). Registration status is computed from dates server-side. | Spec §16. |
| D12 | **Backups**: `pg_dump` script + documented cron; admin Settings page shows last backup timestamp read from a `system_status` row the script updates. | Spec §49. |
| D13 | Sync SQLAlchemy 2.0 + psycopg 3. | Simpler, well-tested; the workload is light CRUD. |
| D14 | Department profile, HOD message, contact details, social links, vision/mission/PEO/PO/PSO live in a **single-row `department` table** (JSONB for lists) edited from Admin → Department. | Spec §8, §25 — all editable. |

---

### Simplifications (agreed with the department, 2026-10-05)

- **No Docker required.** Run backend (`uvicorn`) and frontend (`npm run dev`) directly.
- **Zero-setup database for local use**: `DATABASE_URL` defaults to a SQLite file. Production sets
  `DATABASE_URL=postgresql+psycopg://…` — models use portable types (`JSON`, string enums) so the same
  code and Alembic migrations run on both.
- **Search** uses case-insensitive `LIKE` across indexed columns (portable, ample for department-scale data)
  instead of PostgreSQL full-text.
- **CSRF**: double-submit token kept (small, no extra infra).

## 3. Database schema

Common mixins: `id` (PK, bigint identity), `created_at`, `updated_at`, `created_by_id → admins`, `updated_by_id → admins`, `status` (enum), plus indexes on `status`, year/date columns and FK columns.

| Table | Key columns (beyond mixins) | Constraints |
|-------|-----------------------------|-------------|
| admins | email, full_name, password_hash, is_active, is_superadmin, last_login_at | unique(email) |
| department | name, short_name, college_name, college_logo_url, hero_image_url, tagline, intro, overview, vision, mission (JSONB list), peos, pos, psos, objectives, year_established, accreditation, recognition, facilities, hod_name, hod_designation, hod_photo_url, hod_message, address, college_address, email, phone, map_embed_url, college_website, social_links (JSONB), important_links (JSONB) | single row |
| faculty | name, slug, designation, qualification, specialization, experience_years, email, photo_url, bio, research_interests (JSONB list), publications_text, patents_text, certifications, workshops, fdps, awards, projects_guided, google_scholar_url, orcid_url, linkedin_url, display_order, is_hod | unique(slug), unique(email) nullable |
| students | name, register_no, batch, academic_year, section, photo_url, skills (JSONB), interests (JSONB), projects_text, achievements_text, certifications, email, phone, show_contact, show_photo | unique(register_no) |
| faculty_achievements | faculty_id FK, title, description, category (enum), date, year, organization, level, research_domain, image_url, document_url, external_url | idx(year), idx(category) |
| student_achievements | student_id FK nullable, team_name, participants (text), title, event_name, organizer, position, date, year, category (enum), level (enum), description, certificate_url, image_url, external_url | idx(year, category, level) |
| events | title, slug, event_type (enum), start_at, end_at, venue, speaker, organizer, description, poster_url, registration_url, contact_info, event_status (UPCOMING/ONGOING/COMPLETED/CANCELLED), is_featured | |
| opportunities | title, organizer, institution, city, state, country, mode (ONLINE/OFFLINE/HYBRID), category (enum), start_date, end_date, registration_deadline, eligibility, team_size, description, prize_info, registration_url, website_url, source_url, source, last_verified_at, poster_url, contact_info | idx(state, category, mode, registration_deadline) |
| placement_years | academic_year, eligible_students, students_placed, placement_percentage, highest_package_lpa, average_package_lpa, publish_average, companies_visited, summary | unique(academic_year) |
| placements | academic_year, student_name, student_id FK nullable, company, role, package_lpa, offer_type | idx(academic_year, company) |
| recruiters | name, logo_url, website_url, display_order | unique(name) |
| internships | company, role, duration, location, mode, eligibility, deadline, stipend, description, apply_url, student_name, student_id FK nullable, academic_year, kind (OPENING/STUDENT_ACHIEVEMENT) | |
| publications | title, authors, faculty_id FK nullable, is_student_publication, pub_type (JOURNAL/CONFERENCE/BOOK/BOOK_CHAPTER/OTHER), venue, year, doi, url, domain, indexing | unique(doi) nullable |
| patents | title, inventors, faculty_id FK nullable, patent_no, application_no, status_text, filed_date, granted_date, year, domain, url | |
| research_projects | title, pi_faculty_id FK, funding_agency, amount_lakhs, start_date, end_date, project_status (ONGOING/COMPLETED), domain, collaboration_partner, is_industry_collaboration, description | |
| laboratories | name, slug, description, image_url, equipment (JSONB), software (JSONB), incharge_faculty_id FK, courses (JSONB), student_projects_text, is_research_lab, research_domains (JSONB) | unique(slug) |
| projects | title, description, students (text), guide_faculty_id FK, domain, technologies (JSONB), academic_year, github_url, demo_url, publication, image_urls (JSONB) | |
| alumni | name, batch, graduation_year, organization, designation, higher_studies, achievements, testimonial, photo_url, linkedin_url, events_participated | |
| news | title, slug, summary, content (sanitised HTML/markdown), cover_image_url, published_on, category, author, image_urls (JSONB), external_url, is_featured | unique(slug) |
| gallery_albums | title, slug, description, cover_image_url, event_date | unique(slug) |
| gallery_images | album_id FK (cascade), image_url, public_id, caption, display_order | |
| highlights | title, description, image_url, link_url, display_order | (homepage featured content) |
| activity_logs | admin_id FK, admin_name, action (CREATE/UPDATE/ARCHIVE/RESTORE/DELETE/IMPORT/EXPORT/LOGIN/LOGOUT/LOGIN_FAILED/UPLOAD), module, record_id, record_label, details (JSONB), ip_address, created_at | idx(created_at), idx(module) |
| import_sessions | admin_id, entity, filename, payload (JSONB), summary (JSONB), expires_at, committed_at | |
| system_status | key, value, updated_at | unique(key) |

Search: plain indexes on commonly filtered columns (year, category, status, slug).

---

## 4. API contracts (`/api/v1`)

Pagination envelope for every list: `{ items: [...], total, page, page_size, pages }` (`page_size` max 100).

### Public (no auth; only `PUBLISHED`)
| Method | Path | Notes |
|--------|------|-------|
| GET | /department | single profile |
| GET | /home | department, stats, upcoming events, latest achievements, highlights, latest news (one round trip) |
| GET | /stats | counts computed from DB |
| GET | /{resource} | list with `q`, filters, `page`, `page_size`, `sort` |
| GET | /{resource}/{id_or_slug} | detail |
| GET | /{resource}/facets | distinct values for filter dropdowns (years, categories, states…) |
| GET | /placements/summary | year-wise stats, company-wise counts, recruiters |
| GET | /research/summary | counts by type/domain |
| GET | /search?q= | grouped global search |

Resources: `faculty, students, faculty-achievements, student-achievements, events, opportunities, placements, placement-years, recruiters, internships, publications, patents, research-projects, laboratories, projects, alumni, news, gallery (albums; detail includes images), highlights`.

### Auth
| POST /auth/login | email+password → sets `access_token` (HTTP-only) + `csrf_token` cookies; rate-limited |
| POST /auth/logout | clears cookies, logs LOGOUT |
| GET /auth/me | current admin |
| POST /auth/change-password | |

### Admin (cookie + CSRF; all writes audited)
| GET /admin/{resource} | list incl. drafts/archived, `status` filter |
| GET /admin/{resource}/{id} | |
| POST /admin/{resource} | create |
| PATCH /admin/{resource}/{id} | update |
| POST /admin/{resource}/{id}/archive · /restore | |
| DELETE /admin/{resource}/{id} | hard delete (requires `?confirm=true`) |
| POST /admin/{resource}/bulk | `{ids, action: publish/archive/draft/delete}` |
| PUT /admin/department | update profile |
| POST /admin/uploads | multipart file → Cloudinary; type/size validated → `{url, public_id, resource_type}` |
| GET /admin/stats | dashboard counts + chart series |
| GET /admin/activity-logs | filterable |
| GET /admin/excel/templates/{entity} | blank template download |
| POST /admin/excel/{entity}/preview | returns import session + classified rows |
| POST /admin/excel/imports/{id}/commit | applies session |
| GET /admin/excel/{entity}/export?filters | xlsx download |
| GET /admin/system-status | backup status |
| CRUD /admin/admins | superadmin only |

---

## 5. Frontend routes

Public: `/`, `/about`, `/faculty`, `/faculty/[id]`, `/students`, `/faculty-achievements`, `/student-achievements`, `/events`, `/events/[id]`, `/opportunities`, `/placements`, `/internships`, `/research`, `/laboratories`, `/projects`, `/alumni`, `/news`, `/news/[id]`, `/gallery`, `/gallery/[id]`, `/contact`, `/search`, `not-found`, `error`, `sitemap.xml`, `robots.txt`.

Public pages are server components fetching the API with `revalidate` (60 s) and URL-driven filters (`searchParams`), so filtering/pagination are server-side and shareable.

Admin: `/admin/login`, `/admin/dashboard`, `/admin/department`, `/admin/[resource]` (generic table), `/admin/[resource]/new`, `/admin/[resource]/[id]`, `/admin/gallery/[id]` (image manager), `/admin/excel/import`, `/admin/excel/export`, `/admin/activity-logs`, `/admin/settings`.
`middleware.ts` redirects to `/admin/login` when the auth cookie is absent; the API enforces real authorisation.

---

## 6. Authentication flow

1. `POST /auth/login` → verify Argon2 hash → issue JWT (`sub`, `exp` 8 h) in `access_token` cookie (HttpOnly, SameSite=Lax, Secure in prod, Path=/) and a random `csrf_token` cookie (readable by JS).
2. Admin client sends `X-CSRF-Token` header on POST/PUT/PATCH/DELETE; backend compares with cookie (constant-time).
3. `get_current_admin` dependency decodes the JWT, loads the admin, rejects inactive accounts.
4. Failed logins are rate-limited (5 / 15 min per IP+email) and audited.
5. First admin is created by `python -m scripts.create_admin` (no default credentials).

## 7. File storage strategy

`StorageService` interface with `CloudinaryStorage` (prod) and `LocalStorage` (tests/dev fallback serving `/media`). Upload rules: images `jpg/png/webp/gif` ≤ 5 MB (magic-byte check via Pillow), documents `pdf` ≤ 10 MB. Folder per module (`dept-hub/faculty`, …). Public image rendering uses Cloudinary `f_auto,q_auto,w_…` transforms via a Next.js image loader + lazy loading.

## 8. Excel templates

Columns = human-readable headers mapped to model fields. Natural keys for dedupe/update:

| Template | Natural key |
|----------|-------------|
| students.xlsx | register_no |
| faculty.xlsx | email (fallback name) |
| student_achievements.xlsx | title + event_name + year + participants |
| faculty_achievements.xlsx | faculty_email + title + year |
| events.xlsx | title + start date |
| placements.xlsx | academic_year + student_name + company |
| publications.xlsx | doi (fallback title + year) |
| projects.xlsx | title + academic_year |
| alumni.xlsx | name + graduation_year |

Each row validated by the module's Pydantic create-schema; row errors reported with sheet row number.

## 9. Testing strategy

- **Pytest** against a throwaway database (SQLite by default, PostgreSQL if `TEST_DATABASE_URL` is set), schema created by running the Alembic migrations (proves clean-install migrations). Covers auth, CSRF, rate limiting, authorization, CRUD per module, publish visibility, validation, Excel preview/commit/export, uploads (local driver), search, stats.
- **Playwright** e2e: homepage, faculty browsing, achievements browsing, event filtering, research browsing, admin login, admin CRUD → visible on public site, Excel import, Excel export.

---

## 10. Module-by-module delivery

Each module: model → migration → schemas → API → public page → admin page → validation → tests.

| # | Module | Status |
|---|--------|--------|
| 0 | Foundation: repo, config, DB, Alembic, auth (login/logout/me, CSRF, rate limit), audit log, uploads, generic CRUD framework, Next.js shell, public layout, admin shell + login | [x] |
| 1 | Department profile + About + Contact + footer + Highlights | [x] |
| 2 | Faculty (+ profile pages) | [x] |
| 3 | Students | [x] |
| 4 | Faculty achievements | [x] |
| 5 | Student achievements (achievement wall) | [x] |
| 6 | Events | [x] |
| 7 | Opportunity hub (server-side filters) | [x] |
| 8 | Placements (years, records, recruiters) | [x] |
| 9 | Internships | [x] |
| 10 | Research: publications, patents, research projects | [x] |
| 11 | Laboratories | [x] |
| 12 | Projects | [x] |
| 13 | Alumni | [x] |
| 14 | News | [x] |
| 15 | Gallery (albums + images) | [x] |
| 16 | Home page aggregation + stats | [x] |
| 17 | Excel import/export | [x] |
| 18 | Global search | [x] |
| 19 | Admin dashboard stats/charts, activity logs, settings, backup status | [x] |
| 20 | SEO (metadata, sitemap, robots), error pages, accessibility pass | [x] |
| 21 | Playwright e2e suite, CI, README | [x] |

## 11. Open items / assumptions

- Department identity (name, logo, HOD) is entered by admins; dev seed data is clearly labelled and loaded only by `scripts/seed_dev.py`.
- Cloudinary credentials come from `CLOUDINARY_URL` env var; without it the backend uses local storage (dev only — refused when `ENV=production`).
- Single backend instance assumed for in-memory rate limiting (see D5).

## 12. Implementation notes (decisions made while building)

- **Public pages render per request** (`dynamic = "force-dynamic"`, API fetches `no-store`) so admin changes are
  visible immediately and production builds never depend on the API being reachable. The API is local and fast;
  revisit with tag-based revalidation if traffic grows.
- **No route-level `loading.tsx` on public pages.** With Next.js 15.5 a loading boundary caused (a) detail pages to
  return HTTP 200 instead of 404 and (b) intermittently dropped same-page navigations (filter tabs). Filters show an
  inline "Updating results…" state instead (React `useTransition`).
- **Admin "delete" defaults to archive**; permanent deletion requires an explicit confirmation flag server-side.
- **Opportunity registration status** is computed from deadline (or start date) on the server; "closing soon" = ≤ 7 days.
- **Excel updates are partial**: only columns present in the uploaded sheet are applied to existing records.
- **Exported text that looks like a formula** is written as plain text (spreadsheet formula-injection guard).
- **Uploads** are validated by content (Pillow / PDF signature), not by file name.
- **Verification status**: backend suite (55 tests) and Playwright suite (18 tests) pass locally on SQLite.
  The PostgreSQL run is wired into CI (`TEST_DATABASE_URL`) but has not yet been executed locally.
