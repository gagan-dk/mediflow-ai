# MediFlow AI — Phase 0: Discovery & Audit

> **Status:** COMPLETE — CONFIRMED FACTS only (labelled). Assumptions explicitly marked.
> **Date:** 2026-10-22
> **Auditor:** A1 (Antigravity)
> **Pre-existing TypeScript errors:** 0 (confirmed — `npx tsc --noEmit` exited 0)
> **Code modified:** NONE

---

## 1. Repository Snapshot

| Attribute | Value |
|---|---|
| Project name | mediflow-ai |
| Version | 1.0.0 |
| Node.js (runtime) | v22.16.0 |
| npm | 11.4.1 |
| Frontend framework | React 18.3 + TypeScript 5.7 + Vite 6.1 |
| Styling | Tailwind CSS 3.4 (utility-first, class-based dark mode) |
| Backend framework | FastAPI 0.141 + SQLAlchemy 2 + Alembic + PyJWT + bcrypt |
| Database (configured) | PostgreSQL via psycopg3; a `mediflow.db` SQLite file also exists in `/backend` (likely for local dev/seed) |
| Auth | Firebase Auth (frontend) + custom JWT (backend, `PyJWT 2.10.1`) — **dual-auth system** |
| Maps | Leaflet + React-Leaflet; Geoapify (primary) + LocationIQ (fallback) routing/geocoding |
| Charts | Recharts 2.15 |
| Icons | Lucide-React 0.475 |
| Confetti (gamification) | `canvas-confetti 1.9.4` present in `package.json` — **NOT imported anywhere in `/src`** (dead dep) |
| CI/CD | **None found** — no `.github/`, no CI config |
| Docker | **None found** — no `Dockerfile`, no `docker-compose.yml` |
| Linting config | **None found** — no `.eslintrc`, no `eslint.config.*` |
| Tests (frontend) | **None found** — no test files in `/src`, no vitest/jest config |
| Tests (backend) | 11 pytest files under `backend/tests/` |
| TypeScript errors | 0 (verified) |

---

## 2. Directory Structure (Confirmed)

```
mediflow-ai/
├── src/
│   ├── App.tsx                      # Root; custom router via useState (no react-router)
│   ├── index.css                    # Global base + dark mode + custom animations
│   ├── main.tsx                     # React DOM entry
│   ├── components/                  # 13 components
│   ├── context/
│   │   ├── AppContext.tsx            # Monolithic state: 1297 lines, all app state
│   │   └── AuthContext.tsx           # Firebase Auth wrapper
│   ├── firebase/config.ts           # Firebase app init
│   ├── pages/                       # 15 pages
│   ├── services/                    # 11 service files + api/ + map/ subdirs
│   └── types/                       # 10 TypeScript type files
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI entry; CORS, error handlers, health checks
│   │   ├── api/                     # auth, admin, emergencies, hospitals, staff, deps
│   │   ├── core/                    # config, database, logging, security
│   │   ├── models/                  # SQLAlchemy ORM models (10 files)
│   │   ├── schemas/                 # Pydantic schemas
│   │   └── seed/                    # DB seeding scripts
│   ├── alembic/                     # DB migrations
│   ├── tests/                       # 11 pytest files
│   ├── mediflow.db                  # SQLite dev DB (committed — contains seed data)
│   └── requirements.txt             # Python dependencies
├── docs/
│   └── FRONTEND_DATA_AUDIT.md       # Pre-existing data audit (docs/)
├── .env.example                     # Frontend env template (no real values ✓)
├── backend/.env.example             # Backend env template
├── firebase.json                    # Firebase hosting config
├── .firebaserc                      # Firebase project reference
└── package.json
```

---

## 3. Routes / Pages (Confirmed from App.tsx)

| Path | Page Component | Auth Guard | Role Restriction |
|---|---|---|---|
| `/` | LandingPage | ✅ must be authenticated | none |
| `/assessment` | EmergencyAssessmentPage | ✅ | none |
| `/assessment-result` | AssessmentResultPage | ✅ | none |
| `/finder` | HospitalFinderPage | ✅ | none |
| `/queue` | LiveQueuePage | ✅ | none |
| `/command-center` | HospitalCommandCenterPage | ✅ | hospital_staff, admin only |
| `/ambulances` | EmergencyTransportPage | ✅ | none |
| `/journey` | PatientJourneyPage | ✅ | none |
| `/insights` | SystemInsightsPage | ✅ | admin only |
| `/privacy` | PrivacySecurityPage | ✅ | none |
| `/hospital` | HospitalManagementPage | ✅ | hospital_staff, admin only |
| `/profile` | ProfilePage | ✅ | none |
| `/settings` | SettingsPage | ✅ | none |
| `/admin` | SystemInsightsPage (placeholder) | ✅ | admin only |
| Login (no path) | LoginPage | gate: unauthenticated only | — |
| Register (no path) | RegisterPage | gate: unauthenticated only | — |

> [!IMPORTANT]
> The app uses a **custom `useState`-based router** (not React Router). Navigation is a `navigate(path: string)` function passed as props. There are **no browser URL updates** on navigation — deep links, browser back button, and bookmarks do not work.

---

## 4. State Management (Confirmed)

- **`AppContext.tsx` (1297 lines)** — single monolithic React Context handling: auth, hospitals, assessment, emergency case, queue token, ambulance state, pre-alert, notifications, user profile, theme, geolocation, and simulation controls.
- **`AuthContext.tsx`** — Firebase Auth wrapper.
- **No Redux, Zustand, or other state library** — pure React Context.

---

## 5. Auth Architecture (Confirmed)

**Dual-authentication system:**
1. **Firebase Auth (frontend)** — email/password sign-in; token used to authenticate to backend
2. **Custom Backend JWT** — FastAPI issues its own PyJWT (8-hour expiry); bcrypt-hashed passwords

| Security Control | Status |
|---|---|
| Generic "Invalid email or password" error | ✅ Confirmed — no user enumeration |
| Hospital ID resolved server-side from DB | ✅ Confirmed — client value never trusted |
| Backend secret key checked at startup | ✅ Blocks non-debug start if default value |
| Password hashing | ✅ bcrypt |
| JWT DB-user lookup (not claims-only) | ✅ Confirmed |

---

## 6. Backend API Endpoints (Confirmed)

| Prefix | Description |
|---|---|
| `POST /api/auth/register` | Patient self-service registration |
| `POST /api/auth/login` | Issues JWT |
| `GET /api/auth/me` | Returns current user |
| `GET/POST /api/hospitals/` | Hospital CRUD |
| `GET/POST /api/staff/` | Staff management |
| `GET/POST /api/admin/` | Admin operations |
| `POST /api/emergency-cases/` | Emergency case creation |
| `POST /api/emergency-cases/{id}/select-hospital` | Hospital selection |
| `GET /api/queue/` | Queue token listing |
| `PATCH /api/queue/tokens/{id}/status` | Token status update |
| `GET /api/health` | Liveness probe |
| `GET /api/health/db` | DB connectivity probe |
| `GET /api/health/ready` | Readiness probe (503 if DB unavailable) |

---

## 7. Gamification Audit (Confirmed)

| Element | Status |
|---|---|
| `canvas-confetti` package | In `package.json` — **NOT imported in `/src`** |
| Game scores / XP / streaks / badges | **NOT found** |
| Mascots / cartoon art | **NOT found** |
| Sound effects | Present as class — **all methods are no-ops** |
| Emojis in UI | LoginPage role cards (cosmetic only) |
| Heavy bouncy animations | `animate-bounce` on SOS icon (minor) |

> **CONCLUSION:** The app is **NOT gamified**. `canvas-confetti` is a dead dependency. No XP, streaks, badges, or mascots are active.

---

## 8. Audit Findings Table — 34 Findings

| ID | Area | Finding | Evidence (file) | Severity |
|---|---|---|---|---|
| A-01 | Architecture | Custom `useState` router — no URL sync, no browser back, no deep links | `App.tsx` L27–84 | **High** |
| A-02 | Performance | Monolithic `AppContext` (1297 lines) — all consumers re-render on any state change | `AppContext.tsx` | **High** |
| A-03 | UI/UX | "Simulate Full ER" debug button visible to all users in production Navbar | `Navbar.tsx` L118–125 | **High** |
| A-04 | Dependency | `canvas-confetti` in `package.json` — never imported | `package.json` L12 | **Low** |
| A-05 | Dependency | `soundEffects.ts` — all no-ops, still imported globally | `AppContext.tsx` L20 | **Low** |
| A-06 | UI/UX | `Outfit`/`JetBrains Mono` in Tailwind config but no `<link>` found — falling back to system fonts | `tailwind.config.js` L26–27 | **Medium** |
| A-07 | Accessibility | No `prefers-reduced-motion` support anywhere | Entire codebase | **High** |
| A-08 | Accessibility | Nav `<button>` missing `aria-current="page"` on active state | `Navbar.tsx` L100–110 | **High** |
| A-09 | Accessibility | Mobile menu toggle missing `aria-label` and `aria-expanded` | `Navbar.tsx` L213–218 | **High** |
| A-10 | Accessibility | Profile dropdown doesn't close on Escape or outside click | `Navbar.tsx` L131–184 | **Medium** |
| A-11 | Accessibility | SOS modal not focus-trapped; no `role="dialog"` or `aria-modal` | `Navbar.tsx` L295–335 | **High** |
| A-12 | Security | `SECRET_KEY` default checked at startup but no minimum entropy validation | `core/config.py` L46 | **Medium** |
| A-13 | Security | CORS `allow_methods=["*"]` and `allow_headers=["*"]` — too permissive | `main.py` L36–42 | **Medium** |
| A-14 | Security | **No rate limiting on auth endpoints** (login, register) | `api/auth.py` | **High** |
| A-15 | Security | `mediflow.db` SQLite file committed to repository | `backend/mediflow.db` | **Medium** |
| A-16 | Security | No CSP, HSTS, or security headers configured | `firebase.json`, `vite.config.ts` | **High** |
| A-17 | CI/CD | No CI/CD pipeline — no automated lint, type-check, test, or build | Repo root | **High** |
| A-18 | Testing | No frontend tests at all — no Vitest/Jest config, no `.test.tsx` files | `/src` directory | **High** |
| A-19 | UX | "SIH Healthcare Prototype" badge in DisclaimerBanner — hackathon branding | `DisclaimerBanner.tsx` L34 | **Medium** |
| A-20 | UX | "Smart India Hackathon" label in LandingPage hero pill | `LandingPage.tsx` L56 | **Medium** |
| A-21 | UX | Emoji characters (👤🩺🏢) in LoginPage role cards | `LoginPage.tsx` L46–76 | **Low** |
| A-22 | UX | Desktop nav hidden until `xl` (1280px) — 1024px users see only hamburger | `Navbar.tsx` L96 | **Medium** |
| A-23 | UX | "Simulate Full ER" visible to patients in mobile nav | `Navbar.tsx` L276–282 | **High** |
| A-24 | Accessibility | No skip-navigation link for keyboard users | All pages | **High** |
| A-25 | Performance | No route-level code splitting — full bundle on first load | `App.tsx` L10–24 | **Medium** |
| A-26 | Data | SQLite dev DB committed; default config points to PostgreSQL | `backend/mediflow.db` | **Low** |
| A-27 | Medical Safety | `COMPREHENSIVE_SAFETY_NOTICE` doesn't mention "call 112" explicitly | `prioritizationEngine.ts` L6 | **Medium** |
| A-28 | Medical Safety | Navbar SOS modal hardcodes 108 (ambulance) — confirmed correct ✓ | `Navbar.tsx` L319–324 | **Low** |
| A-29 | Performance | No lazy loading of page components | `App.tsx` all imports | **Medium** |
| A-30 | Performance | `InteractiveMap.tsx` (22 KB) + Leaflet loaded eagerly on all pages | `App.tsx` | **Medium** |
| A-31 | Architecture | `navigate` prop-drilled through every component tree | All pages | **Medium** |
| A-32 | UX | Only one global `ErrorBoundary` — any page crash kills the entire app | `ErrorBoundary.tsx` | **Low** |
| A-33 | Accessibility | Notification drawer — keyboard accessibility not verified (NOT RUN) | `NotificationDrawer.tsx` | **Medium** |
| A-34 | Ops | OSRM public demo fallback configurable with no runtime enforcement | `.env.example` L39–42 | **Low** |

---

## 9. Open Questions for Gate 1

| Q# | Question | Impact if unresolved |
|---|---|---|
| Q1 | Keep SQLite for local dev, or PostgreSQL only? | Dev setup docs |
| Q2 | Preserve "Simulate Full ER" in dev mode, or remove entirely? | Navbar redesign scope |
| Q3 | Font: retain Outfit or switch to Inter (better Indic fallback support)? | Design system |
| Q4 | Which Indian languages for Phase 1 i18n? (Hindi, Kannada, Tamil, Telugu?) | i18n scope |
| Q5 | Production deployment: Firebase Hosting vs cloud VM/container? | DevOps plan |
| Q6 | Replace "SIH Prototype" / "Smart India Hackathon" branding with production copy? | All copy |
| Q7 | Does `.env.local` contain real secrets? If yes, rotate and add to `.gitignore` immediately. | **Security critical** |
| Q8 | Should OSRM demo fallback be permanently disabled in production? | Map service config |

---

## 10. Summary Scores (Pre-Redesign Baseline)

| Category | Score | Status |
|---|---|---|
| Architecture | 6/10 | Solid backend; frontend router and monolithic context are risks |
| Feature completeness | 8/10 | Rich; simulation conflated with production code |
| UI/UX | 5/10 | Functional but inconsistent; hackathon branding; debug controls exposed |
| Accessibility | 3/10 | Significant gaps — no reduced-motion, missing ARIA, no skip nav |
| Security | 6/10 | Good backend fundamentals; missing rate limits, CSP, CORS hardening |
| Performance | 5/10 | No code splitting; bundle size NOT measured |
| Testing | 4/10 | Good backend coverage; zero frontend tests |
| DevOps | 2/10 | No CI/CD, no Docker, no deployment pipeline |
| Medical safety | 7/10 | Disclaimer present; SOS accurate; "call 112" missing from main notice |

> [!NOTE]
> All scores are estimates based on code inspection. Numbers requiring measurement (bundle size, LCP, INP, CLS, contrast ratios, test pass rates) are marked **NOT RUN** and will be measured in Phase 3.

---

*This audit covers Phase 0 only. No code has been modified. Awaiting Gate 1 approval before proceeding to Requirements (Phase 1) and Design (Phase 2).*
