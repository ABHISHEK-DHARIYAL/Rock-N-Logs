# Rock n Logs — split into backend + frontend

```
rock-n-logs/
├── backend/    → deploy on RENDER  (Express + Prisma + PostgreSQL API)
└── frontend/   → deploy on VERCEL  (Next.js website + admin UI)
```

How they talk: the browser calls same-origin `/api/*` on the Vercel site; `frontend/next.config.ts`
rewrites that to the Render backend. Server-rendered pages call the backend directly via `BACKEND_URL`.
The admin cookie is therefore first-party (no cross-site cookie problems).

## 1. Database
Create a PostgreSQL database (Render Postgres, Neon, or Supabase) and copy its connection string.

## 2. Backend → Render
New → **Web Service** → connect the repo → **Root Directory: `backend`** (or use `render.yaml`).

| Setting | Value |
|---|---|
| Runtime | Node |
| Build command | `npm install && npm run build && npx prisma db push` |
| Pre-deploy command | *(leave empty — paid plans only)* |
| Start command | `npm start` |
| Health check path | `/api/health` |

Environment variables: `DATABASE_URL`, `ADMIN_JWT_SECRET` (`openssl rand -base64 32`),
`FRONTEND_URL` (your Vercel URL, no trailing slash; comma-separate extra domains; `*` wildcards allowed,
e.g. `https://rock-n-logs-*.vercel.app`), `ADMIN_SEED_EMAIL`, `ADMIN_SEED_PASSWORD` (8+ chars),
`NODE_ENV=production`, plus optional `RESTAURANT_*`, `CLOUDINARY_*`, `WHATSAPP_*`.

**No Shell needed.** The API creates the admin account on every boot from `ADMIN_SEED_EMAIL` /
`ADMIN_SEED_PASSWORD`, and updates the password if you change that variable and redeploy.
(Emails are stored lowercase.) Check the Render logs for `[bootstrap] Created admin user ...`.

## 3. Frontend → Vercel
Add New Project → import repo → **Root Directory: `frontend`** (Framework: Next.js, auto-detected).

Environment variables:
- `BACKEND_URL` = your Render URL (e.g. `https://rock-n-logs-api.onrender.com`, no trailing slash)
- `NEXT_PUBLIC_SITE_URL` = your Vercel URL / custom domain

`BACKEND_URL` is read at build time (rewrites), so **redeploy the frontend after changing it**. The build now
fails with a clear message if it is missing.

## 4. Finish
Make sure Render's `FRONTEND_URL` matches the URL you browse (custom domain too). Sign in at
`https://<your-vercel-url>/admin/login`.

### Troubleshooting login
| Symptom | Cause |
|---|---|
| "Invalid email or password" | Wrong creds, or DATABASE_URL on Render points at a different DB than you expect. Check Render logs for `[bootstrap]`. |
| "server rejected this site's address" (403) | `FRONTEND_URL` doesn't include the URL you're on. Render logs show `[originCheck] Blocked ...`. |
| "server isn't responding yet" | Render free instance is waking up (30–60 s), or `BACKEND_URL` is wrong. |
| "Too many sign-in attempts" | 5 failures / 15 min per IP+email; wait, or restart the Render service. |

## Local development
```bash
cd backend  && cp .env.example .env && npm install && npx prisma db push && npm run dev   # :4000 (creates the admin on boot)
cd frontend && cp .env.example .env.local && npm install && npm run dev                                   # :3000
```

## Notes
- **Render free tier sleeps** after ~15 min idle; the first request can take ~30–60 s. Pages now wait for it (up to 60 s), but for a live site use a paid instance or ping `/api/health` every 10 min (e.g. UptimeRobot).
- **Rate limiting is in-memory** (one instance). Fine for one Render instance; use Redis before scaling out.
- **Uploads go through the Vercel proxy.** Vercel caps function request bodies at 4.5 MB; if large PDF menus (limit 15 MB) fail with 413 in production, either keep PDFs under ~4 MB or point the upload form directly at the backend (would require cross-site cookie config).
- The admin JWT secret lives only on the backend; the frontend middleware only checks that a cookie exists, and the backend does the real verification.
