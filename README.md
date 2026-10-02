# SRKians — City Connect & Fan Club Platform

> **Find Your City. Find Your Fan Club. Find Your SRKian Family.**

A city-first network for Shah Rukh Khan fans. A fan picks their city, finds verified fan clubs, reaches the admins without exposing anyone's phone number, joins the club, and signs up for events and FDFS (First Day First Show).

> **Independent fan platform.** This platform is not officially affiliated with Shah Rukh Khan, Red Chillies Entertainment, or any official organization. **"Verified Fan Club" means the club was verified by this platform's moderators.** It does not mean official verification. The disclaimer appears in every footer and can be edited in Admin → Site settings.

This version deliberately has **no social feed**: no posts, likes, comments, followers or hashtags.

---

## Contents
1. [Architecture](#architecture)
2. [Features](#features)
3. [Tech stack](#tech-stack)
4. [Quick start](#quick-start)
5. [Environment variables](#environment-variables)
6. [External services](#external-services-cloudinary-smtp-firebase)
7. [Seed data & demo logins](#seed-data--demo-logins)
8. [Roles & permissions](#roles--permissions)
9. [API](#api)
10. [Testing](#testing)
11. [Production build & deployment](#production-build--deployment)
12. [Security notes](#security-notes)
13. [Known limitations](#known-limitations)

---

## Architecture

```
srkproject/
├── server/                 Express + Mongoose API (ESM, Node ≥ 20)
│   ├── config/             env + DB connection
│   ├── constants/          roles/permissions (RBAC map), enums, point rules
│   ├── models/             27 Mongoose models
│   ├── validators/         zod request schemas
│   ├── middleware/         auth, RBAC, validation, sanitisation, rate limits, uploads, errors, maintenance
│   ├── controllers/        thin HTTP layer
│   ├── services/           business logic (controller → service → model)
│   ├── routes/             /api/v1 routers
│   ├── sockets/            Socket.io (real-time notification delivery only)
│   ├── jobs/               event/FDFS status sync + "starts tomorrow" reminders
│   ├── seed/               idempotent seed + initial launch data (Nashik)
│   ├── scripts/dev-memory.js  zero-install dev mode (in-memory MongoDB)
│   └── tests/              node:test + supertest integration suite
└── client/                 React 19 + Vite + Tailwind 4
    └── src/
        ├── api/            axios client (in-memory access token, single-flight refresh) + endpoint map
        ├── context/        Auth, Settings (DB-driven branding), Toast
        ├── components/     ui/ (Button, Form, Modal/Drawer/Confirm, Display…), cards/, common/
        ├── features/       fanclub/ (event, FDFS, QR and announcement forms), admin/ (tables, charts)
        ├── layouts/        MainLayout (header, mobile bottom nav, footer), DashboardLayout
        ├── pages/          public/, auth/, user/, fanclub/, admin/, legal/
        ├── routes/         lazy route table + guards
        ├── hooks/ services/ store/ utils/ validations/ constants/
        └── public/         manifest, service worker, offline page, robots.txt
```

Request flow: `route → validate(zod) → authenticate → requirePermission → controller → service → model`. Authorization is enforced on the server. Ownership checks, such as "does this user manage this club?" or "is this moderator assigned to this city?", are done again in the service layer, never trusted from the client.

## Features

| Area | What's included |
|---|---|
| **City discovery** | Country → State → City selector, type-ahead city search, city directory with filters, city pages (`/cities/nashik`) with live stats, verified clubs, FDFS, events, admins/moderators, announcements, "Join community" |
| **Accounts** | Register (with city), login, logout, refresh-token rotation with reuse detection, forgot/reset password, email verification, change password, account deletion (anonymises personal data) |
| **Profiles** | Public profile with privacy controls (public profile, city, Instagram, fan clubs, events attended); email and phone are never exposed |
| **Fan clubs** | Registration → PENDING → approve / reject / request changes / suspend / restore, with review history. Verified badge, directory (filters: country/state/city/active; sorts: popular/newest/largest/A–Z), join/leave, OPEN / APPROVAL_REQUIRED / CLOSED membership, member management |
| **City WhatsApp contact** | Each city can carry a WhatsApp invite link and a contact number, shown **only to members and that city's moderators** — the public page says they exist but never carries either. Both come back with the join response, so they appear the moment someone joins. The number is the city's own, never a moderator's personal phone (`User.phone` stays `select: false`) |
| **Contact privacy** | Admins toggle Instagram / WhatsApp / phone / WhatsApp-group visibility. Hidden values are **stripped server-side** from every API response. "Contact Admin" in-app requests with NEW/READ/RESPONDED/CLOSED status |
| **Events** | 7 event types, DRAFT/UPCOMING/ONGOING/COMPLETED/CANCELLED, filters, Interested / Going / Cancel with atomic capacity, registration deadline, WhatsApp link shown only to registrants, Google Calendar + `.ics` export |
| **FDFS** | City FDFS listings; unknown theatre, show time and meeting point display **"To Be Announced"**. Participants, open/close registration, change notifications ("theatre updated") |
| **Check-in** | QR code per event/FDFS (regenerable). Scanning marks ATTENDED once and awards points. Organisers can also mark attendance manually and export a CSV |
| **Announcements** | GLOBAL / COUNTRY / STATE / CITY / FAN_CLUB / EVENT / FDFS targets, each authorised by scope |
| **Notifications** | In-app centre (unread count, mark read / all read, delete), per-type preferences, real-time delivery over Socket.io, FCM push when configured |
| **Admin network** | Private directory of verified clubs and admins, plus collaboration requests (PENDING/ACCEPTED/REJECTED/CLOSED) |
| **Films & countdown** | Admin-managed SRK film catalogue (poster, banner, synopsis, trailer, release date — optional, shown as "To Be Announced"). Homepage countdown to the next dated release, `/movies` directory and per-film page listing every city organising an FDFS. "Invite organisers" notifies every verified club admin once per film; they open their city's FDFS in one click, pre-filled from the film |
| **Moments** | Recurring fandom dates (2 November, film anniversaries) stored as day/month so they return each year, with a ± day window. A live moment shows a homepage banner; checking in at any event or FDFS while it runs awards its commemorative badge |
| **City race** | Monthly city-vs-city standings on the homepage and `/leaderboard?board=cities`, summed from **this month's** points transactions only, so the board resets on the 1st |
| **Points, badges, referrals** | Points only from real participation (idempotent, revoked on cancel). Rule-based badges configurable by admins. Referral codes (`/join?ref=SRK-XXXX`) with abuse limits (no self-referral, per-network cap, daily reward cap, reward only after real participation) |
| **Leaderboard** | Global / country / state / city / fan club |
| **Search** | Global debounced search across cities, clubs, events, FDFS and public profiles, plus header suggestions |
| **Moderation** | Reports (5 target types, 8 reasons, 4 statuses, moderator notes); city moderators are scoped to their cities |
| **Super admin** | Dashboard, analytics (users today/week/month, growth series, FDFS participation, most-active cities by real activity, top cities/clubs, referral growth), users (search, suspend, delete, roles, moderator city assignment, award points), fan clubs, countries/states/cities (create/edit/feature/disable, never hard-deleted while referenced), events/FDFS, badges, audit logs, site settings (branding, hero, SEO, social, disclaimer, default images, maintenance mode) |
| **SEO / PWA** | Per-page title/description/canonical/Open Graph/Twitter tags + JSON-LD (React 19 head hoisting); dynamic `sitemap.xml`; `robots.txt`; web manifest, service worker, offline page |
| **UX** | Dark cinematic design system, mobile bottom nav, loading/empty/error states everywhere, reduced-motion support, keyboard focus states, ARIA combobox and dialog semantics, focus trap in modals |

## Tech stack

**Frontend:** React 19, Vite 8, React Router 7, Tailwind CSS 4, Framer Motion, TanStack Query, React Hook Form + zod, Axios, lucide-react, Recharts (admin only, lazy-loaded), qrcode.react, socket.io-client.
**Backend:** Node.js, Express 4, MongoDB + Mongoose 9, JWT (access) + rotating opaque refresh tokens (httpOnly cookie), bcryptjs, zod, helmet, cors, express-rate-limit, express-mongo-sanitize, compression, multer, Cloudinary SDK, nodemailer, Socket.io.

## Quick start

Requirements: **Node 20+**. MongoDB is optional for local development.

```bash
npm run install:all          # installs server/ and client/
```

**Option A: zero-install database (fastest):**
```bash
npm run dev:api:memory       # starts an in-memory MongoDB, seeds it and runs the API on :5000
npm run dev:web              # Vite on http://localhost:5173 (proxies /api, /uploads and /socket.io to :5000)
```
Data is lost when the API stops.

**Option B: real MongoDB (local or Atlas):**
```bash
cp server/.env.example server/.env    # set MONGO_URI + JWT secrets
npm run seed                          # idempotent; `npm --prefix server run seed:reset` wipes dev data first
npm run dev:api                       # node --watch
npm run dev:web
```

MongoDB Atlas: create a cluster, add a database user, allow your server's IP, and use the `mongodb+srv://…/srkians` connection string as `MONGO_URI`.

## Environment variables

`server/.env` (full template in `server/.env.example`):

| Variable | Required | Notes |
|---|---|---|
| `NODE_ENV` | yes | `production` enforces real secrets and secure cookies |
| `PORT` | | default 5000 |
| `MONGO_URI` | yes | local or Atlas |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | **prod** | random 48+ byte strings; dev falls back to insecure placeholders |
| `CLIENT_URL` | yes | frontend origin(s), comma-separated. Used for CORS, email links and the sitemap |
| `SERVER_URL` | | public API URL (only used for dev-local upload URLs) |
| `COOKIE_SAMESITE`, `COOKIE_SECURE` | | defaults: `none` + `true` in production (cross-site Vercel ↔ Render) |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | prod uploads | see below |
| `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` | optional | push notifications |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | optional | email |
| `SEED_ADMIN_PASSWORD` | recommended | password for the seeded super admin |

`client/.env` (template in `client/.env.example`): `VITE_API_URL` (e.g. `https://api.example.com/api/v1`; leave empty in dev), `VITE_SOCKET_URL`, `VITE_SITE_URL` (canonical/share URLs).

**Never commit `.env` files.** They are git-ignored.

## External services (Cloudinary, SMTP, Firebase)

> **Without Cloudinary, uploads fall back to the database** (`provider: 'db'`, served from
> `/api/v1/uploads/:id` and cached immutably), capped at 600KB per image — the browser downscales
> anything larger to 1280px first. It works, but every view costs a function invocation and the
> bytes sit in Mongo, so configure Cloudinary before the gallery grows. Every image field also
> accepts a link
> ("or paste a link"), stored as `provider: 'external'` — useful for branding images committed to
> `client/public/images/`, which Vercel serves at `https://<domain>/images/<file>`. That covers the
> hero, social share image and default covers, but not fan club logos or event covers: club admins
> have nowhere to host their own, so set the `CLOUDINARY_*` variables before launch.

The app runs without any of these. It never pretends a service is connected when it isn't:

- **Cloudinary.** Create a free account and copy the cloud name, API key and secret into `server/.env`. Uploads are validated (MIME type + extension + 5 MB limit + magic-byte sniffing) and stored as `{ url, publicId }`. *Without Cloudinary:* development saves files to `server/uploads/`; production refuses uploads with a clear 503.
- **SMTP.** Any provider (Brevo, SES, Mailgun…). *Without SMTP*, password-reset and verification emails are **printed to the server console**. Laragon ships **Mailpit**: set `SMTP_HOST=127.0.0.1`, `SMTP_PORT=1025` to catch mail locally.
- **Firebase Cloud Messaging (push).**
  1. Run `npm --prefix server install firebase-admin` (it's an optional dependency and is loaded lazily).
  2. Create a service account key and set the three `FIREBASE_*` variables. Keep the private key's `\n` escapes.
  3. On the web, add the Firebase JS SDK, get a token with your VAPID key and `POST /api/v1/users/me/fcm-tokens` (`client/src/services/pwa.js` exposes `registerPushToken`). `public/sw.js` already displays incoming pushes.

  Until then, in-app and real-time (Socket.io) notifications work fully and push is a silent no-op.

## Seed data & demo logins

`npm run seed` (or the memory mode) creates:
- **India → Maharashtra → Nashik, Mumbai, Pune, Nagpur, Aurangabad** (Nashik, Mumbai and Pune featured)
- Roles, permissions, 7 default badges, site settings
- **SRK Aryan FC Nashik** (approved, featured). Instagram `@srkaryanfc_nashik`, WhatsApp `7020318629`. The WhatsApp number is **hidden by default** (`showWhatsApp: false`); the club admin can turn it on in Fan club dashboard → Settings. Launch data lives in `server/seed/initial-data.js`, not in components.
- Clearly labelled **demo** data: a `[Demo]` fan meet, a demo **KING FDFS in Nashik** (theatre/show time left "To Be Announced"; the release date is the placeholder from the launch brief, so confirm it before publicising), and a `[Demo]` announcement. Demo records have `isDemo: true` and show a "Demo" badge.
- Fandom **moments** (2 November, DDLJ and Pathaan anniversaries) and their two commemorative badges.

### All of India's cities

`npm run seed:cities` adds **36 states and union territories and ~500 major cities**, so people can find their own city at sign-up instead of hitting a dead end — registration requires an existing city, and only a super admin can create one.

Run it once after `npm run seed`. It is **idempotent and additive**: it only inserts, never renames, disables or deletes, so re-running it after editing `server/seed/india-cities.js` just adds the new names and leaves everything an admin has since changed alone.

City slugs are globally unique but several Indian city names are not (Bilaspur, Udaipur, Aurangabad, Hamirpur, Pratapgarh). Whichever is imported first keeps the plain slug; later ones are qualified by state, e.g. `/cities/udaipur` and `/cities/udaipur-tripura`.

| Role | Email | Password |
|---|---|---|
| Super admin | `admin@srkians.local` | `Admin@12345` (or `SEED_ADMIN_PASSWORD`) |
| City moderator (Nashik) | `moderator@srkians.local` | `Moderator@12345` |
| Fan club admin | `clubadmin@srkians.local` | `ClubAdmin@12345` |
| User | `demo@srkians.local` | `Demo@12345` |

**Before going live:** change the super admin password and delete or suspend the demo accounts (Admin → Users).

## Roles & permissions

Defined once in `server/constants/roles.js` (`ROLE_PERMISSIONS`) and seeded into the `Role`/`Permission` collections.

| Role | Can |
|---|---|
| `USER` | manage profile, choose city, join clubs/events/FDFS, report, receive notifications |
| `FAN_CLUB_ADMIN` | everything above + manage **their own** club, members, events, FDFS, announcements, contact requests, analytics, admin network |
| `CITY_MODERATOR` | everything above + review clubs, reports, events and announcements **in their assigned cities only**, view analytics for those cities |
| `SUPER_ADMIN` | everything, including users, locations, badges, audit logs and site settings |
| `STATE_ADMIN`, `COUNTRY_ADMIN` | reserved; already accepted by the RBAC map for future geographic tiers |

Applying for a club doesn't change a user's role. Approval promotes the applicant from `USER` to `FAN_CLUB_ADMIN` and makes them the club's admin member.

## API

Base: `/api/v1`. Every response uses the same envelope:

```json
{ "success": true, "message": "Operation successful", "data": {} }
{ "success": false, "message": "Something went wrong", "errors": [{ "field": "email", "message": "…" }] }
```

| Module | Endpoints |
|---|---|
| Auth | `POST /auth/register · /auth/login · /auth/logout · /auth/refresh · /auth/forgot-password · /auth/reset-password · /auth/verify-email · /auth/resend-verification · /auth/change-password`, `GET /auth/me` |
| Users | `GET /users/:username`, `PATCH /users/me`, `DELETE /users/me`, `PATCH /users/me/location · /me/privacy · /me/notification-preferences`, `POST/DELETE /users/me/fcm-tokens`, `GET /users/me/fan-clubs · /me/registrations · /me/badges · /me/referrals · /me/contact-requests` |
| Locations | `GET /countries`, `GET /states?country=`, `GET /cities`, `GET /cities/search?q=`, `GET /cities/:slug`, `POST /cities/:id/join` |
| Fan clubs | `GET /fan-clubs`, `GET /fan-clubs/:slug`, `POST /fan-clubs/apply`, `PATCH /fan-clubs/:id`, `POST /fan-clubs/:id/join`, `DELETE /fan-clubs/:id/leave`, `POST /fan-clubs/:id/contact` |
| Club manager | `GET /fan-club/managed · /fan-club/:id/dashboard · /fan-club/:id/members`, `PATCH /fan-club/:id/members/:memberId`, `GET/PATCH /fan-club/contact-requests[/:id]`, `GET /fan-club/events · /fan-club/fdfs · /fan-club/announcements` |
| Network | `GET /network/directory`, `GET/POST /network/collaborations`, `PATCH /network/collaborations/:id` |
| Events | `GET /events`, `GET /events/:slug`, `GET /events/:slug/calendar.ics`, `POST /events`, `PATCH /events/:id`, `POST /events/:id/attendance`, `GET /events/:id/attendees`, `POST /events/:id/attendees/:userId/attended`, `GET /events/:id/check-in-code`, `POST /events/:id/check-in` |
| FDFS | same shape under `/fdfs` (`POST /fdfs/:id/join`, `/participants`, check-in) |
| Notifications | `GET /notifications`, `GET /notifications/unread-count`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`, `DELETE /notifications/:id` |
| Other | `GET/POST /announcements`, `PATCH/DELETE /announcements/:id`, `POST /reports`, `GET /stats · /discover · /search · /search/suggestions · /leaderboard · /badges · /settings/public`, `POST /referrals/click`, `POST /uploads/image?folder=` |
| Admin | `GET /admin/dashboard · /admin/analytics`, `GET/PATCH/DELETE /admin/users[/:id]`, `POST /admin/users/:id/points`, `GET /admin/moderators`, `GET /admin/fan-clubs`, `PATCH /admin/fan-clubs/:id/status`, `PATCH /admin/fan-clubs/:id`, `GET/POST/PATCH/DELETE /admin/{countries,states,cities}[/:id]`, `GET/PATCH /admin/events[/:id]`, `GET/PATCH /admin/fdfs[/:id]`, `GET/PATCH /admin/reports[/:id]`, `GET /admin/audit-logs`, `GET/POST/PATCH /admin/badges[/:id]`, `POST /admin/badges/:id/award`, `GET/PATCH /admin/settings` |

Also `GET /sitemap.xml` at the API root. Socket.io is on the same origin (auth token in the handshake; event `notification:new`).

## Testing

```bash
npm test          # 30 integration tests against an in-memory MongoDB
```

They cover registration (including location-chain validation and duplicate email), login, logout, refresh rotation and reuse detection, forgot/reset password, `/auth/me`, city search and detail, city change with consistent member counts, fan club application, approval RBAC (user, club admin and moderator), audit log entry, join/leave with duplicate prevention, contact-admin flow, event creation and permissions, attendance with capacity, FDFS create/join/update notifications, QR check-in (bad code, success, duplicate), notifications (read/read-all/delete, preferences honoured), public profile privacy, contact-number privacy, moderator city scoping, suspension blocking sessions, NoSQL-injection rejection, reports, and live stats.

## Production build & deployment

**Frontend on Vercel:** set the root to `client/`, build `npm run build`, output `dist`, and set `VITE_API_URL`, `VITE_SOCKET_URL` and `VITE_SITE_URL`. `client/vercel.json` provides the SPA rewrites and cache headers. To serve the sitemap from your domain, add a rewrite `{ "source": "/sitemap.xml", "destination": "https://<your-api>/sitemap.xml" }` and update `robots.txt` with the absolute sitemap URL.

**Backend on Render / Railway / a VPS:** set the root to `server/`, start with `npm start` (Node 20+), and set `NODE_ENV=production`, `MONGO_URI`, both JWT secrets, `CLIENT_URL=https://your-frontend`, plus Cloudinary and optionally SMTP/Firebase. WebSockets must be enabled (they are on Render and Railway). On a VPS, run it behind Nginx with `proxy_set_header Upgrade/Connection` for `/socket.io`, and use pm2 or systemd. `trust proxy` is already set for correct client IPs.

**Database:** MongoDB Atlas. Indexes are defined on the models. `autoIndex` is off in production, so set `MONGO_AUTO_INDEX=true` for the first boot or run `Model.syncIndexes()` once. Then run `npm run seed` once against production to create locations, roles, badges and the super admin, and remove the demo records afterwards.

## Security notes

- Passwords are hashed with bcrypt (12 rounds). Login returns the same error for an unknown user and a wrong password.
- Access token (15 min) is held in memory only, never localStorage. The refresh token is an opaque random string in an **httpOnly, SameSite, Secure** cookie scoped to `/api/v1/auth`. Only its SHA-256 hash is stored. It **rotates on every refresh**, and reuse of a rotated token revokes the whole token family (a short grace window tolerates two tabs refreshing at once). Password change/reset and suspension revoke all sessions.
- Helmet, strict CORS allow-list, rate limits (global, auth, sensitive, write), `express-mongo-sanitize`, `query parser: simple` (no nested query objects), zod whitelisting on every write, HTML tag stripping on inputs, a 200 KB body limit.
- Uploads are authenticated and checked for MIME type, extension, size and magic bytes.
- RBAC permissions come from the server-side map, with ownership/city scoping checked in services. Client route guards are UX only.
- Private contact data (club phone/WhatsApp, user email/phone) is removed from API responses unless explicitly shared.
- Audit log for moderation, user, location, badge, points and settings changes (actor, action, target, metadata, IP).
- Maintenance mode blocks the API for everyone except super admins.

## Known limitations

- The frontend is an SPA. Meta tags are set client-side (fine for Google, but some social crawlers won't run JS). Server-side rendering or prerendering is the upgrade path for rich link previews.
- Browser push needs the Firebase web SDK wiring described above. The server side and the service worker are ready.
- "Active" fan clubs means clubs with upcoming events/FDFS. Every club in the public directory is verified by design, so no separate "verified" filter is shown.
- Moment badges use the MANUAL badge rule so the threshold evaluator never awards them; only `awardMomentBadges` does, on confirmed attendance.
- The city race aggregates points transactions per request. At launch scale this is fine; denormalising a `city` onto `PointsTransaction` is the upgrade path if it gets slow.
- Background jobs use in-process timers. On multi-instance deployments, run them on one instance (`DISABLE_JOBS=true` on the others).
- Legal pages are plain-language templates. Have them reviewed before launch.
