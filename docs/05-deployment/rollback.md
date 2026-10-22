# MediFlow AI — Production Deployment & Rollback Runbook

## 1. Overview & Architecture

MediFlow AI uses a decoupled deployment architecture:
- **Frontend:** Static single-page application built with Vite/React, deployed via Vercel with HTTP security headers and client-side SPA routing.
- **Backend:** FastAPI REST service containerized with Docker, deployed with healthcheck probes and PostgreSQL connectivity.

---

## 2. Pre-Deployment Verification Checklist

Before deploying any commit to production:
1. [ ] Frontend type-check passes: `npx tsc --noEmit` exits `0`.
2. [ ] Frontend production build succeeds: `npm run build` exits `0`.
3. [ ] Backend test suite passes: `pytest tests` passes 100% of test cases.
4. [ ] Environment variables configured in deployment dashboard (never commit `.env` or `.env.local`).
5. [ ] Database migrations applied: `alembic upgrade head`.

---

## 3. Rollback Procedures

### 3.1 Frontend (Vercel) Instant Rollback

If a critical frontend regression occurs (UI breakdown, broken route, client-side runtime error):

1. **Dashboard 1-Click Rollback:**
   - Navigate to **Vercel Dashboard > Project > Deployments**.
   - Locate the last known healthy deployment.
   - Click the three dots `...` next to the healthy deployment and select **"Promote to Production"**.
   - Instant traffic redirection completes within 10–15 seconds with zero build delay.

2. **CLI Instant Rollback:**
   ```bash
   vercel rollback <deployment-url-or-id>
   ```

### 3.2 Backend Rollback

If a backend regression or API error rate spike occurs:

1. **Container / Service Rollback:**
   - If using Docker / Kubernetes:
     ```bash
     # Roll back to the previous image tag
     kubectl rollout undo deployment/mediflow-backend
     # Check rollout status
     kubectl rollout status deployment/mediflow-backend
     ```
   - If using cloud platform (Render, Railway, Fly.io, AWS ECS):
     - Select previous active revision and click **"Rollback"**.

2. **Database Migration Rollback (if schema changed):**
   ```bash
   # In backend directory
   alembic downgrade -1
   ```

### 3.3 Emergency Killswitch & Triage Fallback

- If the AI prioritization engine or backend database becomes temporarily unavailable:
  - Frontend displays `ErrorBoundary` fallback with retry button and clear safety instruction:
    > "In a real emergency, call 112 immediately."
  - Patients are prompted to proceed directly to the nearest emergency room.

---

## 4. Post-Rollback Postmortem Protocol

1. Record incident timeline in incident log.
2. Review structured error logs (`mediflow.*`) and exception traces.
3. Add a regression test in `backend/tests/` or frontend test suite.
4. Verify root cause before attempting redeployment.
