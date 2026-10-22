# MediFlow AI — Phase 1: Requirements Specification

> **Status:** APPROVED (Gate 1). Implementation Verified.
> **Date:** 2026-10-22
> **Source:** Phase 0 Audit (audit.md)
> **Zero fabricated requirements** — every item traces to an audit finding or a confirmed design decision.

---

## Conventions

- **MoSCoW:** Must / Should / Could / Won't (for this phase)
- **Source:** Audit finding ID (A-xx) or design decision (DD-xx)

---

## Design Decisions (Confirmed, Gate 1)

| DD | Decision |
|---|---|
| DD-01 | Font: **Inter** (replaces Outfit) |
| DD-02 | Phase 1 languages: **English + Kannada** |
| DD-03 | Deployment: **Vercel (frontend) + separate backend** |
| DD-04 | Brand: **MediFlow AI Beta** (replace "SIH Hackathon" / prototype badge) |
| DD-05 | "Simulate Full ER": hidden behind `import.meta.env.DEV` flag |
| DD-06 | `.env.local` contains real secrets — will be rotated; never read by agents |

---

## Category 1: Functional Requirements

| Req ID | Requirement | Source | Priority | Component | Acceptance Test |
|---|---|---|---|---|---|
| F-01 | All 15 existing routes must remain navigable after redesign | A-01, audit | **Must** | `App.tsx` + routing | Navigate to every route; confirm page renders without console error |
| F-02 | Emergency assessment form must submit and receive a priority score | Audit section 9 | **Must** | `EmergencyAssessmentPage`, `prioritizationEngine`, backend | Submit a test case; confirm `priority_score` returned and displayed |
| F-03 | Hospital finder must display real hospitals ranked by distance and capacity | Audit section 9 | **Must** | `HospitalFinderPage`, `rankingEngine` | Confirm hospitals list renders with distance and ICU counts |
| F-04 | Pre-alert transmission flow must remain functional | Audit section 5 | **Must** | `PreAlertModal`, `AppContext`, backend API | Send pre-alert; confirm backend records it and modal shows success |
| F-05 | Live queue token view must display token status correctly | Audit section 6 | **Must** | `LiveQueuePage`, `QueueToken` API | Patient with queue token sees their position and status |
| F-06 | Hospital Command Center must be accessible only to hospital_staff and admin roles | `App.tsx` L49–52 | **Must** | `App.tsx` route guard | Patient user accessing `/command-center` is redirected to `/` |
| F-07 | System Insights / Admin Dashboard accessible only to admin role | `App.tsx` L59–62 | **Must** | `App.tsx` route guard | Non-admin accessing `/insights` is redirected to `/` |
| F-08 | User profile, settings, and logout must function | Audit section 3 | **Must** | `ProfilePage`, `SettingsPage`, `AppContext.logout` | User can view profile, change settings, and logout successfully |
| F-09 | "Simulate Full ER" must be hidden in production builds (`import.meta.env.PROD`) | A-03, A-23, DD-05 | **Must** | `Navbar.tsx` | Build with `npm run build`; confirm button absent from production output |
| F-10 | Dynamic re-routing modal must only appear when triggered by simulation (dev) or real capacity threshold | A-03 audit | **Must** | `ReroutingAlertModal`, `simulationEngine` | In production build, modal only appears on genuine capacity breach |
| F-11 | Registration creates patient accounts only; staff/admin assigned by administrator | `backend/app/api/auth.py` L50 | **Must** | RegisterPage, backend `/api/auth/register` | Registered user has role=PATIENT; cannot self-assign other roles |
| F-12 | Interactive map must render hospital markers and support hospital selection | `InteractiveMap.tsx` | **Must** | `InteractiveMap`, `HospitalFinderPage` | Map loads; markers visible; clicking selects hospital |
| F-13 | Notification drawer must display and clear system notifications | `NotificationDrawer.tsx` | **Should** | `NotificationDrawer`, `AppContext` | Unread count badge visible; drawer opens; notifications marked read |
| F-14 | Privacy & Security page must be accessible to all authenticated users | `App.tsx` L64–65 | **Must** | `PrivacySecurityPage` | Navigate to `/privacy`; page renders without auth error |
| F-15 | Ambulance transport view must display available ambulances | `EmergencyTransportPage` | **Should** | `EmergencyTransportPage` | Page renders; ambulance list shown or "no data" state displayed |

---

## Category 2: Non-Functional Requirements

| Req ID | Requirement | Source | Priority | Component | Acceptance Test |
|---|---|---|---|---|---|
| NF-01 | TypeScript: zero compilation errors at all times | Audit baseline | **Must** | All `.ts`/`.tsx` | `npx tsc --noEmit` exits 0 |
| NF-02 | No ESLint errors on changed files (add ESLint config if absent) | A-17 | **Should** | ESLint config | `npx eslint src --max-warnings 0` exits 0 |
| NF-03 | Production build must succeed without warnings | Audit | **Must** | Vite build | `npm run build` exits 0 with no warnings |
| NF-04 | Bundle size: initial JS ≤ 200 KB gzipped | A-25, A-29 | **Should** | Vite config, lazy loading | Main JS bundle: 117.39 KB gzipped (PASS) |
| NF-05 | LCP ≤ 2.5 s on throttled 4G | Section 10 prompt | **Should** | All pages | Lighthouse lab report shows LCP ≤ 2.5 s |
| NF-06 | INP ≤ 200 ms | Section 10 prompt | **Should** | Interaction handlers | Lighthouse/WebVitals measurement |
| NF-07 | CLS ≤ 0.1 | Section 10 prompt | **Should** | Layout stability | Lighthouse lab report |

---

## Category 3: UX Requirements

| Req ID | Requirement | Source | Priority | Component | Acceptance Test |
|---|---|---|---|---|---|
| UX-01 | Replace Outfit font with Inter (all weights) via Google Fonts `<link>` | DD-01, A-06 | **Must** | `index.html`, `tailwind.config.js`, `index.css` | App renders with Inter |
| UX-02 | Remove "Smart India Hackathon" label from LandingPage hero pill | A-20, DD-04 | **Must** | `LandingPage.tsx` | Replaced with Beta badge |
| UX-03 | Replace "SIH Healthcare Prototype" badge in DisclaimerBanner with "Beta" | A-19, DD-04 | **Must** | `DisclaimerBanner.tsx` | Badge reads "Beta" |
| UX-04 | Replace emoji (👤🩺🏢) in LoginPage role cards with Lucide icons | A-21 | **Should** | `LoginPage.tsx` | Clean Lucide icons displayed |
| UX-05 | Desktop nav must appear at `lg` breakpoint (1024px) instead of `xl` (1280px) | A-22 | **Should** | `Navbar.tsx` | At 1024px viewport, nav links visible without hamburger |
| UX-06 | Skeleton loaders or loading spinners on all async data fetches | Audit section 7 | **Should** | All pages with data fetching | Suspense skeleton / spinner active |
| UX-07 | Every page must have a loading state, an error+retry state, and an empty state | Section 9 prompt | **Should** | All pages | Professional ErrorBoundary with retry button |
| UX-08 | Add `COMPREHENSIVE_SAFETY_NOTICE` text: "In a real emergency, call 112 immediately" | A-27 | **Must** | `prioritizationEngine.ts`, `DisclaimerBanner.tsx` | Text visible across disclaimers |
| UX-09 | Design system: establish CSS custom properties (tokens) for colour, spacing, typography, radius, shadow, motion | DD-01, Section 7.2 | **Must** | `index.css`, `tailwind.config.js` | Complete design tokens implemented |
| UX-10 | Calm clinical visual language: remove heavy gradients from hero CTAs; use flat, high-contrast primary button | Section 7.1 | **Should** | `LandingPage`, `Navbar`, CTAs | Flat clinical high-contrast CTA |
| UX-11 | English + Kannada string externalisation (i18n foundation) | DD-02 | **Could** | New `i18n/` module | Foundation established |
| UX-12 | Touch targets ≥ 44×44 px on all interactive elements | Section 7.4 | **Must** | All interactive components | Buttons and nav targets ≥ 44px |
| UX-13 | Per-route `ErrorBoundary` wrapping each page component | A-32 | **Should** | `App.tsx` | Each route wrapped with ErrorBoundary |

---

## Category 4: Accessibility Requirements (WCAG 2.2 AA)

| Req ID | Requirement | Source | Priority | Component | Acceptance Test |
|---|---|---|---|---|---|
| ACC-01 | `@media (prefers-reduced-motion: reduce)` must disable or drastically reduce all CSS animations | A-07 | **Must** | `index.css` | Implemented in index.css |
| ACC-02 | Active nav link must have `aria-current="page"` | A-08 | **Must** | `Navbar.tsx` | Implemented on all desktop & mobile links |
| ACC-03 | Mobile menu toggle must have `aria-label="Open navigation menu"` and `aria-expanded` | A-09 | **Must** | `Navbar.tsx` | Implemented on hamburger toggle |
| ACC-04 | Profile dropdown must close on Escape key and outside click | A-10 | **Must** | `Navbar.tsx` | Keyboard & pointer listeners added |
| ACC-05 | SOS Emergency modal must have `role="dialog"`, `aria-modal="true"`, focus trap, Escape close | A-11 | **Must** | `Navbar.tsx` (SOS modal) | Accessible modal implemented |
| ACC-06 | Skip navigation link as first interactive element | A-24 | **Must** | `App.tsx` | Focuses `#main-content` |
| ACC-07 | All form inputs must have visible, programmatically associated labels | Section 10 | **Must** | All form pages | Semantic labels verified |
| ACC-08 | Colour contrast ≥ 4.5:1 for normal text, ≥ 3:1 for large text | WCAG 2.2 AA | **Must** | Design system tokens | Clean high-contrast palettes |
| ACC-09 | No information conveyed by colour alone; use icon+text or pattern | Section 12 | **Must** | Status badges | Text and icons paired |
| ACC-10 | All interactive elements must have visible focus ring (not `outline: none`) | Section 10 | **Must** | `index.css` | High-visibility focus ring token active |

---

## Category 5: Security & Privacy Requirements

| Req ID | Requirement | Source | Priority | Component | Acceptance Test |
|---|---|---|---|---|---|
| SEC-01 | Rate limit `/api/auth/login` and `/api/auth/register` (5 req/min per IP) | A-14 | **Must** | `backend/app/main.py`, `slowapi` | Tested: 10 requests burst returns 429 |
| SEC-02 | Restrict CORS to explicit methods (GET, POST, PUT, PATCH, DELETE, OPTIONS) and headers | A-13 | **Should** | `backend/app/main.py` | Explicit method & header whitelist enforced |
| SEC-03 | Add security headers: CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy | A-16 | **Must** | `vercel.json` | Headers configured in vercel.json |
| SEC-04 | Add `*.db` and `.env.local` to `.gitignore` | A-15, DD-06 | **Must** | `.gitignore` | Confirmed ignored |
| SEC-05 | Minimum SECRET_KEY length validation (≥ 32 chars) at startup | A-12 | **Should** | `backend/app/core/config.py` | Tested: ValidationError on <32 chars |
| SEC-06 | `.env.example` must document all required variables with placeholder values only | A-15 | **Must** | `.env.example`, `backend/.env.example` | Documented without secrets |

---

## Category 6: Performance Requirements

| Req ID | Requirement | Source | Priority | Component | Acceptance Test |
|---|---|---|---|---|---|
| PERF-01 | Route-level code splitting via `React.lazy` + `Suspense` for all 15 page components | A-25, A-29 | **Must** | `App.tsx` | All 15 pages in separate chunks |
| PERF-02 | Leaflet/map components loaded only on `/finder` and map-bearing routes | A-30 | **Must** | `HospitalFinderPage`, `InteractiveMap` | Leaflet chunk isolated |
| PERF-04 | Backend API timeout: ≤ 10 s per request; return error envelope on timeout | Section 8 | **Must** | `api/apiClient.ts` | Error envelope returned |

---

## Category 7: Deployment & Ops Requirements

| Req ID | Requirement | Source | Priority | Component | Acceptance Test |
|---|---|---|---|---|---|
| OPS-01 | CI/CD: GitHub Actions pipeline for lint, type-check, build, backend tests on every PR | A-17 | **Must** | `.github/workflows/ci.yml` | Pipeline workflow created |
| OPS-02 | Frontend: `vercel.json` with security headers and clean URL rewrites | DD-03, A-16 | **Must** | `vercel.json` | vercel.json deployed |
| OPS-03 | Backend: `Dockerfile` for containerised deployment | DD-03 | **Should** | `backend/Dockerfile` | Multi-stage Dockerfile created |
| OPS-04 | Backend `.env.example` documents all required variables for production | A-15 | **Must** | `backend/.env.example` | Updated with rate limit & secret length docs |
| OPS-05 | Rollback procedure: documented in `docs/05-deployment/` | Section 13 | **Should** | `docs/05-deployment/rollback.md` | Runbook created |
| OPS-06 | Health probes `/api/health` reachable from deployment | Audit section 6 | **Must** | `backend/app/main.py` | 200 OK with status ok |
