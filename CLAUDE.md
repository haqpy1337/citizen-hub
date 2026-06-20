# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**haqpy Miner Assistant (hMA)** — A Star Citizen refinery job tracker. Players log ore drop-offs at refinery stations, track live processing timers, and compare stations using live data from the UEX Corp API.

Working directory: `D:\Claude\Projekte\hMA\sc-refinery-assistant\sc-refinery-assistant`

## Commands

```bash
npm run dev          # Start dev server at http://localhost:3000
npm run build        # prisma generate + next build
npm run lint         # ESLint via Next.js
npm run db:push      # Sync Prisma schema → SQLite (use --force-reset to wipe data)
npm run db:studio    # Open Prisma Studio (DB browser)
```

**First-time setup:**
```bash
npm install
cp .env.example .env   # then set AUTH_SECRET (any long random string)
npm run db:push
npm run dev
```

## Architecture

### Stack
- **Next.js 14** (App Router) + TypeScript — single codebase for frontend and API routes
- **Prisma + SQLite** (`prisma/dev.db`) — switch to PostgreSQL by changing `provider` in `prisma/schema.prisma` and updating `DATABASE_URL`
- **Tailwind CSS** with CSS custom properties for theming (dark/light)
- **jose** for JWT sessions, **bcryptjs** for password hashing, **zod** for validation

### Auth flow
- Username + password only (no email)
- `POST /api/auth/register` and `/api/auth/login` set an httpOnly cookie (`hma_session`) containing a signed JWT
- `src/middleware.ts` runs in the **Edge runtime** and protects all `/dashboard/*` routes by verifying the JWT via `src/lib/jwt.ts` — this file must stay Edge-compatible (no `next/headers`, no Node APIs)
- `src/lib/auth.ts` is the Node-runtime counterpart (uses `next/headers`) for server components and route handlers
- Session payload: `{ userId, username }`

### UEX API layer (`src/lib/uex/`)
The entire live-data integration lives here. Three files with clear separation:

- **`types.ts`** — Raw UEX API shapes + normalized frontend types. **All UEX field names live here.** If the API changes a field name, fix it only in this file.
- **`client.ts`** — `uexFetch<T>(endpoint, opts)` — fetches any UEX endpoint, handles a 5-minute in-memory cache and graceful fallback to empty array on error.
- **`endpoints.ts`** — Higher-level functions (`getRefineryStations`, `getRefineryMethods`, `getOreCommodities`) that combine multiple API calls into normalized shapes for the frontend.

**Key UEX field gotchas (discovered from real API responses):**
- `refineries_capacities.value` = queue time **in seconds** (not percentage, not minutes)
- `refineries_yields.value` = yield modifier in % (can be **negative**, e.g. -5)
- `refineries_methods.rating_speed` (not `rating_duration`)
- `commodities_raw_averages` endpoint does **not exist** — use `commodities` directly
- Filter raw ores with `is_refinable === 1` (not `is_raw` alone — avoids showing refined versions)

### Data flow
1. API routes in `src/app/api/` call UEX endpoints or Prisma
2. `src/lib/clientTypes.ts` defines the shapes the **frontend** consumes from our own API routes (separate from UEX raw types)
3. Client components (`"use client"`) call our own `/api/*` routes via `fetch`

### Theming
Colors are **CSS custom properties** defined in `globals.css` (`:root` = dark, `html.light` = light). Tailwind config references these via `var(--color-*)`. Toggle adds/removes the `light` class on `<html>`. Preference stored in `localStorage` under key `hma-theme`. The `ThemeProvider` client component in `layout.tsx` hydrates this on mount.

### Pages & components
All dashboard pages are under `src/app/dashboard/` and protected by middleware. The dashboard layout (`dashboard/layout.tsx`) also does a server-side session check.

| Route | Purpose |
|---|---|
| `/dashboard` | Tile grid + active job preview |
| `/dashboard/jobs` | Active jobs board (create only from here) |
| `/dashboard/history` | Past/completed jobs with profit estimates |
| `/dashboard/finder` | Best refinery finder + profit calculator |
| `/dashboard/ores` | Full ore price table (raw + refined) |
| `/dashboard/refineries` | Live refinery overview with queue/yield |

### Profit calculation
Estimated profit = `quantity × (yieldPercent / 100) × pricePerScu`. The yield stored on a job is the **modifier** from UEX (e.g., -5 means 5% less than base), entered manually or auto-filled when a station is selected in the job form. Prices come from `commodities.price_sell` at the time of viewing (not stored at job creation).

### Validation
`src/lib/validation.ts` contains all Zod schemas. `yieldPercent` allows `-100` to `100` (negative modifiers are valid UEX data).

### Duration input
`parseDurationInput` in `src/lib/format.ts` accepts `"1h 30m"`, `"90m"`, `"01:30:00"`, or a bare number (interpreted as minutes).
