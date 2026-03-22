## Project Overview

Julius is your smart shopping companion for Brazilian households, tackling the chaos of fluctuating grocery prices, forgotten needs, and impulse buys. By scanning receipts, tracking product prices, matching them to your shopping needs, and alerting you to killer deals, it helps you optimize spending and build smarter lists. Families and budget-conscious shoppers save time and money, turning grocery runs into strategic wins.

## Codebase Reference

> **Detailed Analysis**: For complete symbol counts, architecture layers, and dependency graphs, see [`codebase-map.json`](./codebase-map.json).

## Quick Facts

- Root: `/Users/maiconramos/Documents/workspace/julius`
- Languages: TypeScript (42 files), JavaScript (10 files)
- Entry: `src/app/layout.tsx`, `src/middleware.ts`
- Full analysis: [`codebase-map.json`](./codebase-map.json)

## Entry Points

- [`src/app/layout.tsx`](../src/app/layout.tsx#L13) — Root layout for the Next.js app.
- [`src/middleware.ts`](../src/middleware.ts#L5) — Authentication and security middleware.
- [`package.json`](../package.json) — NPM scripts like `dev`, `build`, `start`.

## Key Exports

> See [`codebase-map.json`](./codebase-map.json) for the complete list, including API handlers (`GET`, `POST`, etc.), utilities like `cn`, `sanitize`, and core logic like `matchProductToNeeds` and `getBestPrice`.

## File Structure & Code Organization

- `src/` — Core TypeScript source: Next.js app router with pages (e.g., `/lista`, `/necessidades`), API routes (e.g., `/api/shopping-list`, `/api/prices`), `lib/` utils (matching, analytics, validation), `components/` (UI like charts, sheets), and `db/` (Drizzle ORM setup).
- `docs/` — Project documentation, including this overview and guides.
- Root config files — `next.config.ts` (Next.js config), `drizzle.config.ts` (DB migrations), `eslint.config.mjs` (linting), `postcss.config.mjs` (Tailwind/PostCSS), `package.json` & `pnpm-lock.yaml` (pnpm workspace).

## Technology Stack Summary

Built on Next.js (App Router) with TypeScript for a full-stack web app targeting Vercel or similar. Primary runtime: Node.js. Languages: TypeScript (main), JavaScript (some deps). Build tooling: pnpm (workspace manager), esbuild/Turbopack via Next.js. Linting: ESLint (flat config). Formatting: Prettier (inferred). Styling: Tailwind CSS + PostCSS. Database: Drizzle ORM (likely PostgreSQL/Neon). No heavy bundling beyond Next.js.

## Core Framework Stack

- **Backend/API**: Next.js API routes with server actions; patterns like RPC-style handlers (`GET`/`POST` exports) and middleware for auth/security.
- **Frontend**: React Server Components (RSC) in `src/app/`; client components in `src/components/` for interactivity.
- **Data**: Drizzle ORM for schema/migrations/seeding; price analytics and need-matching engines in `src/lib/`.
- **Architectural Patterns**: Vertical slices (API routes per domain: shopping-list, needs, prices); utils layer for pure functions.

## UI & Interaction Libraries

- **shadcn/ui**: Reusable primitives like `Sheet`, `Input`, `DropdownMenu` in `src/components/ui/` — accessible, Tailwind-based, customizable themes.
- **Tailwind CSS**: Utility-first styling with `cn()` class merger from `src/lib/utils.ts`.
- Considerations: Responsive design for mobile shopping; Portuguese localization in pages like `/promocoes`; basic accessibility via shadcn (ARIA, keyboard nav).

## Development Tools Overview

Essential: `pnpm` for installs/scripts (`pnpm dev` for hot-reload). DB: `pnpm db:push` (Drizzle migrations), `pnpm db:seed`. Linting: `pnpm lint`. For deeper setup, see [tooling.md](./tooling.md).

## Getting Started Checklist

1. Clone the repo and `cd` into `/Users/maiconramos/Documents/workspace/julius`.
2. Install dependencies: `pnpm install`.
3. Set up your `.env` (DB URL, auth secrets) — copy from `.env.example`.
4. Run migrations and seed: `pnpm db:push && pnpm db:seed`.
5. Start dev server: `pnpm dev` (opens http://localhost:3000).
6. Verify: Create a need at `/necessidades`, add a receipt at `/notas`, check dashboard.
7. Explore: Review [development-workflow.md](./development-workflow.md) for testing/CI.

## Next Steps

Positioned as an MVP for Brazilian grocery optimization—next up: mobile app, AI price predictions, Mercado Pago integration (MCP endpoints ready). Stakeholders: Lead dev (you?), household users. Check [architecture.md](./architecture.md) for layers and product specs in issues.

## Related Resources

- [architecture.md](./architecture.md)
- [development-workflow.md](./development-workflow.md)
- [tooling.md](./tooling.md)
- [codebase-map.json](./codebase-map.json)
