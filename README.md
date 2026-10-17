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

## Ordering & bills
- **Menu → Add to order.** Customers add dishes on `/menu` (a cart that survives reloads), then review them on `/book`.
- **Two ways to book.** "Just the table" (seats only) or "Table + food" (pre-order from the cart).
- **Bill.** After submitting, the customer lands on `/book/receipt/<private-token>` with their itemised bill, status, a print/save-as-PDF button and a copy-link button. Staff see the pre-order and total on `/admin/bookings`.
- **Currency.** Defaults to USD. Set `NEXT_PUBLIC_CURRENCY` / `NEXT_PUBLIC_LOCALE` on Vercel (e.g. `INR` / `en-IN`) and redeploy.
- **Database.** This adds two nullable columns; the Render build command's `prisma db push` applies them. Existing bookings are untouched (they simply have no receipt link).

### Adding to an order that's already placed
- **Customer:** the receipt page (`/book/receipt/<token>`) has an **Add dishes** panel while the booking is Pending or Confirmed. The bill updates immediately.
- **Staff:** `/admin/bookings` has an **Add items** button on Pending/Confirmed bookings (e.g. for phone-in extras).
- A dish already on the order has its quantity increased; the 20-per-dish and 100-item limits apply to the whole order. Cancelled/Completed bookings can't be changed. Prices always come from the database.

### Troubleshooting: "Something went wrong" / 500 when booking
Open `https://<your-backend>.onrender.com/api/health/db` in a browser. `ok` means the database matches the code. `schema-out-of-date` means run `npx prisma db push` against the production database (it only adds what's missing). `database-unreachable` means check `DATABASE_URL` / that the database isn't paused. Booking failures from these causes now show a clear message instead of a generic one.

### Booking date & time rules
- The booking form pre-fills the earliest bookable slot that is inside opening hours, and blocks past dates, times less than 30 minutes away, and dates more than 180 days ahead.
- **Opening hours** from `/admin/settings` (e.g. `Tue–Sun, 5pm–11pm`, `Mon–Fri 11am–10pm; Sat–Sun 10am–midnight`, `Daily 6pm–2am`) limit which times can be booked. The server re-checks this, so it can't be bypassed. The settings page shows how your text was understood.
- If the hours text can't be read, or is empty, bookings are not limited (so a typo never blocks every order).

### Menu ordering
- `/admin/menu` has **↑ / ↓** buttons to reorder dishes within a category. New dishes go to the end of their category. Items with equal sort order fall back to creation time, so the order is always stable.
- The saved cart is checked against the live menu on `/menu` and `/book`; dishes that were deleted or made unavailable are removed and the customer is told which.

### Security notes for ordering
- **Prices are server-side.** The browser sends only dish ids and quantities. Names and prices come from the database at submit time, so a tampered request can't change the bill. Unavailable or deleted dishes are rejected.
- **Strict input validation.** Unknown fields rejected; length caps on every field; phone format checked; control characters stripped; max 20 of a dish, 100 items, 40 distinct dishes; bookings limited to 180 days ahead.
- **Receipt links are bearer secrets.** 192-bit random token, only its SHA-256 hash is stored, lookups are rate limited and uncacheable, the page is `noindex` with `Referrer-Policy: no-referrer`, and the bill shows a masked phone and no email.
- **Existing protections kept:** per-IP rate limit (5 bookings/hour), honeypot, minimum fill time, admin-only access to full booking details.
- **Cart data in the browser is untrusted:** re-validated on every load.
- **Not included (add if you need it):** online payment, and enforcing table capacity (bookings stay manual-confirm by design).

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
