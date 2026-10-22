# MediFlow AI — Phase 2: UX Design

> **Status:** APPROVED (Gate 1). Implementation Complete.
> **Date:** 2026-10-22
> **Designer:** Antigravity Engineering Team
> **Design direction:** "Calm clinical, modern SaaS" — Inter typeface, teal-blue palette, structured layouts, 0 gamification

---

## 1. Evidence-Based Personas

### P1 — Ravi, Patient / Caregiver (Primary)
- **Context:** Bangalore resident, mid-range Android phone (Chrome), 4G connection
- **Goal:** Get the right hospital fast when a family member has a health emergency
- **Pain points:** Doesn't know which hospital has ICU space; can't navigate complex interfaces under stress
- **Needs:** Large touch targets, plain language, immediate "call 112" escape hatch, 1-tap emergency start
- **Language:** Kannada or English

### P2 — Dr. Ananya, Hospital Staff (Secondary)
- **Context:** Works in ER command centre; desktop (Chrome/Firefox); strong connectivity
- **Goal:** See incoming pre-alerts, manage bed allocation, track queue in real time
- **Pain points:** Too many tabs; confusing dashboards; information overload
- **Needs:** Dense data in clear hierarchy; keyboard-navigable; no visual noise

### P3 — Admin / Network Manager (Tertiary)
- **Context:** Hospital network administrator; desktop
- **Goal:** Monitor regional capacity, manage user accounts, view analytics
- **Needs:** System-wide metrics, clean tables, reliable data (no faked numbers)

---

## 2. Primary User Journeys

### J1 — Emergency Patient Journey (Critical Path)
```
Login → Landing (see live capacity) → Emergency Assessment 
     → Assessment Result (see priority score + ranked hospitals) 
     → Select Hospital + Send Pre-Alert 
     → Live Queue (track token) → Patient Journey tracker
```

### J2 — Hospital Staff Journey
```
Login (hospital_staff) → Hospital Management (bed status) 
     → Command Center (incoming pre-alerts, queue) 
     → Manage queue tokens (call/complete patients)
     → View ambulance status
```

### J3 — Admin Journey
```
Login (admin) → System Insights (regional KPIs) 
     → Hospital network overview 
     → User / staff management
```

---

## 3. Design System

### 3.1 Typography

| Token | Value | Usage |
|---|---|---|
| `--font-sans` | `'Inter', system-ui, -apple-system, sans-serif` | All body, UI |
| `--font-mono` | `'JetBrains Mono', 'Fira Code', monospace` | Data, tokens, codes |
| `--text-xs` | 12px / 1.5 | Labels, captions |
| `--text-sm` | 14px / 1.5 | Body small, table rows |
| `--text-base` | 16px / 1.6 | Body |
| `--text-lg` | 18px / 1.5 | Card headings |
| `--text-xl` | 20px / 1.4 | Section headings |
| `--text-2xl` | 24px / 1.3 | Page headings |
| `--text-3xl` | 30px / 1.2 | Hero headings |
| `--text-4xl` | 36px / 1.15 | Landing hero H1 |

### 3.2 Colour Tokens (Clinical Palette)

- **Primary:** `--color-primary-*` (#0284c7 / #0369a1)
- **Neutral:** Slate scale (#0f172a, #475569, #e2e8f0, #ffffff)
- **Semantic:** Success (#16a34a), Warning (#d97706), Danger (#dc2626)

### 3.3 Motion & Accessibility

- `@media (prefers-reduced-motion: reduce)` disables all animations and transitions.
- Visible focus rings with 2px offset on all interactive components.
- Minimum touch target 44×44px.
