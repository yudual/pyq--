# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

Kanle is a WeChat-Moments-style personal blog. It has two independently run Node/TypeScript applications; there is no root workspace package or root build command:

- `frontend/` — Next.js 16 / React 19 App Router application, styled with Tailwind CSS v4. Public pages, admin UI, RSS, and the revalidation route live under `src/app/`; shared UI is in `src/components/`; client state and request helpers are in `src/lib/`.
- `backend/` — Express 5 API with Sequelize/MySQL. Domain routers live in `src/routes/`, data models and associations in `src/models/`, cross-cutting middleware in `src/middleware/`, and integrations/storage logic in `src/services/`.
- `deploy/nginx.conf` — VPS deployment proxy/static-file configuration. Both apps have PM2 ecosystem configs.

## Commands

Run commands from the relevant application directory. This project uses pnpm.

```bash
# frontend/
pnpm install
pnpm dev          # Next development server (normally port 3000)
pnpm lint         # ESLint across the frontend
pnpm build        # production build
pnpm start        # serve the production build

# backend/
pnpm install
pnpm dev          # nodemon + TypeScript backend (normally port 4000)
pnpm build        # compile TypeScript to dist/
pnpm start        # run dist/index.js
pnpm db:init       # controlled, repeatable schema/default-data initialization
```

Additional backend maintenance scripts are declared in `backend/package.json`, including `db:reset-likes`, `db:migrate-douban-cache`, `db:migrate-font-family`, `db:migrate-footer-html`, `db:migrate-decoration-image`, and `music:migrate-r2`.

There are no first-party test files and no `test` script. The frontend has the only configured lint command; the backend has no standalone linter.

## Local setup and request flow

1. Create a MySQL-compatible database, configure `backend/.env` from `.env.example`, then run `pnpm db:init` from `backend/`. This command creates missing tables, additive compatibility fields, site settings/default playlist, and an initial admin only when none exists.
2. Configure `frontend/.env.local` from `frontend/.env.example` and start both applications.
3. Keep `NEXT_PUBLIC_API_URL=/api`. Browser requests go to the frontend origin and `frontend/next.config.ts` rewrites `/api/*` and `/uploads/*` to `BACKEND_URL`; server-side frontend requests use that absolute backend origin. Keep API/token behavior centralized through `frontend/src/lib/api-fetch.ts`.

`REVALIDATE_SECRET` is server-only and must match in both applications. `NEXT_PUBLIC_MEDIA_ORIGIN` must exactly match backend `R2_PUBLIC_URL`; it is used at frontend build time for Next Image allowlisting. Never use `NEXT_PUBLIC_` for the revalidation or cron secrets.

## Backend initialization and media rules

`src/app.ts` composes CORS, parsing/cookie middleware, visitor identity, database readiness, domain routes under `/api`, and centralized error handling. `src/index.ts` is the traditional long-lived server entry point; `api/index.ts` serves the same Express app on Vercel. `src/bootstrap.ts` memoizes database readiness per process/function instance.

Do not make schema changes happen during ordinary application startup or serverless cold starts. `DB_SYNC_ON_BOOT=true` exists only as a compatibility switch; use the explicit `db:init` workflow in a controlled maintenance environment.

Production media uses Cloudflare R2. Preserve the direct-upload flow: backend presigns upload → browser uploads directly to R2 → backend confirms the upload. Vercel's filesystem is not persistent, so do not implement normal production media uploads through its serverless filesystem or multipart proxy.

## Deployment modes

- **Recommended:** independent Vercel projects rooted at `frontend/` and `backend/`. The backend Vercel function uses the Node runtime because it requires MySQL/mysql2. It exposes the shared Express app and has a daily Douban synchronization cron.
- **Self-hosted:** frontend standalone build on port 3000 and backend on port 4000, supervised with the supplied PM2 configs. Nginx proxies `/api/` to the backend, proxies the rest to Next.js, and can serve legacy local uploads plus static emoji/font assets.

For serverless database connections, `src/config/database.ts` intentionally defaults to a small pool (`max=2`) versus traditional deployments (`max=10`); retain that environment-sensitive behavior unless deployment capacity is deliberately being changed.

## Project-specific instructions

`frontend/AGENTS.md` applies to frontend work: this repository uses a Next.js version with potentially unfamiliar or breaking conventions. Before changing Next.js APIs, routing, caching, or configuration, read the relevant documentation under `frontend/node_modules/next/dist/docs/` and heed its deprecation notices.
