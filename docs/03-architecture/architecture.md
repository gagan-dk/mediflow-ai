# MediFlow AI — Phase 2: System Architecture

> **Status:** APPROVED (Gate 1). Implementation Complete.
> **Date:** 2026-10-22
> **Architect:** Antigravity Engineering Team
> **Source:** Phase 0 Audit + confirmed design decisions

---

## A. System Context Diagram

```mermaid
graph TB
    subgraph Users
        P["Patient / Caregiver<br/>(mobile Chrome)"]
        S["Hospital Staff<br/>(desktop)"]
        ADM["Admin<br/>(desktop)"]
    end

    subgraph MediFlowAI["MediFlow AI Platform"]
        FE["Frontend SPA<br/>React 18 + Vite<br/>Vercel CDN"]
        BE["Backend API<br/>FastAPI + SQLAlchemy<br/>Cloud server"]
        DB[("PostgreSQL<br/>Database")]
    end

    subgraph External
        FB["Firebase Auth<br/>(Google)"]
        GEO["Geoapify<br/>(Maps + Routing)"]
        LIQ["LocationIQ<br/>(Fallback routing)"]
    end

    P -->|HTTPS| FE
    S -->|HTTPS| FE
    ADM -->|HTTPS| FE
    FE -->|Firebase SDK| FB
    FE -->|REST + JWT Bearer| BE
    FE -->|HTTPS API calls| GEO
    FE -->|HTTPS API calls| LIQ
    BE -->|SQLAlchemy / psycopg3| DB
```

---

## B. High-Level Architecture

```mermaid
graph LR
    subgraph Client["Client (Browser)"]
        SPA["React SPA<br/>Tailwind + Inter font<br/>Leaflet + Recharts"]
        LS["localStorage<br/>(JWT token only)"]
    end

    subgraph CDN["Vercel Edge Network"]
        VCDN["Static assets<br/>HTML/JS/CSS<br/>Security headers"]
    end

    subgraph Backend["Backend Server (Cloud VM / Container)"]
        FAPI["FastAPI<br/>Uvicorn"]
        MW["Middleware:<br/>CORS · Rate Limit · Logging"]
        AUTH["Auth router<br/>/api/auth/*"]
        HOSP["Hospitals router<br/>/api/hospitals/*"]
        EMRG["Emergency router<br/>/api/emergency-cases/*<br/>/api/queue/*"]
        STAFF["Staff router<br/>/api/staff/*"]
        ADMIN["Admin router<br/>/api/admin/*"]
        HEALTH["Health probes<br/>/api/health/*"]
    end

    subgraph Data["Data Layer"]
        PG[("PostgreSQL<br/>Primary")]
        ALM["Alembic<br/>Migrations"]
    end

    SPA <-->|CDN cache| VCDN
    SPA -->|Bearer JWT| FAPI
    SPA -->|Firebase SDK| FB["Firebase Auth"]
    FAPI --> MW --> AUTH & HOSP & EMRG & STAFF & ADMIN & HEALTH
    AUTH & HOSP & EMRG & STAFF & ADMIN --> PG
    ALM --> PG
```

---

## C. Frontend Component / Routing Architecture

```mermaid
graph TD
    Entry["main.tsx<br/>ReactDOM.createRoot"]
    App["App.tsx<br/>AuthProvider → AppProvider → AppContent"]

    subgraph Auth["Auth Gate (unauthenticated)"]
        Login["LoginPage"]
        Register["RegisterPage"]
    end

    subgraph Shell["Authenticated Shell"]
        Topbar["Navbar (sticky)"]
        MainContent["main#main-content"]
        Footer["Footer"]
        PreAlert["PreAlertBanner"]
        ReRoute["ReroutingAlertModal (conditional)"]
    end

    subgraph Pages["Pages (React.lazy Chunks)"]
        LP["LandingPage"]
        EA["EmergencyAssessmentPage"]
        AR["AssessmentResultPage"]
        HF["HospitalFinderPage"]
        LQ["LiveQueuePage"]
        CC["HospitalCommandCenterPage"]
        ET["EmergencyTransportPage"]
        PJ["PatientJourneyPage"]
        SI["SystemInsightsPage"]
        PV["PrivacySecurityPage"]
        HM["HospitalManagementPage"]
        PR["ProfilePage"]
        ST["SettingsPage"]
    end

    Entry --> App
    App --> Auth
    App --> Shell
    Shell --> MainContent
    MainContent --> Pages
```

---

## D. Backend Module / API Architecture

```mermaid
graph TD
    subgraph Entry["Entry Point"]
        Main["app/main.py<br/>FastAPI app · CORS · Error handlers<br/>Health probes · Rate Limiter"]
    end

    subgraph Routers["API Routers (app/api/)"]
        Auth["auth.py<br/>POST /register<br/>POST /login<br/>GET /me"]
        Hosp["hospitals.py<br/>GET|POST /hospitals<br/>GET /hospitals/{id}"]
        Staff["staff.py<br/>Staff CRUD<br/>HospitalStaff assignment"]
        Emrg["emergencies.py<br/>POST /emergency-cases<br/>POST /…/select-hospital<br/>GET|PATCH /queue/tokens/{id}"]
        Admin["admin.py<br/>Admin-only operations"]
        Deps["deps.py<br/>get_current_user<br/>require_role<br/>get_current_staff_hospital<br/>pagination"]
    end

    subgraph Core["Core (app/core/)"]
        Cfg["config.py (Settings / pydantic-settings)"]
        DB["database.py (SQLAlchemy engine + session)"]
        Sec["security.py (JWT create/decode · bcrypt)"]
        Log["logging.py (Structured logger)"]
        Lim["limiter.py (SlowAPI rate limiter)"]
    end

    subgraph Models["ORM Models (app/models/)"]
        User["User"]
        Hosp2["Hospital · HospitalStaff · Facility · Operations"]
        Emrg2["EmergencyCase · QueueToken · Patient"]
        Amb["Ambulance"]
    end

    Main --> Auth & Hosp & Staff & Emrg & Admin
    Auth & Hosp & Staff & Emrg & Admin --> Deps
    Deps --> DB & Sec
    Main --> Cfg & Log & Lim
    Routers --> Models
```
