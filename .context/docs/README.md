# Julius Documentation Hub

Welcome to the **Julius** documentation knowledge base. This app is a Next.js-based personal shopping assistant that tracks products, prices, receipts, needs, and shopping lists. It features price analytics, need matching, deal alerts, and a dashboard for insights.

Start with the [Project Overview](./project-overview.md) for a high-level summary, then explore guides tailored to developers, contributors, and operators.

## Quick Start for Developers

### Tech Stack
- **Framework**: Next.js (App Router)
- **Database**: PostgreSQL with Drizzle ORM (`src/db/`)
- **UI**: Tailwind CSS, shadcn/ui components (`src/components/ui/`)
- **Validation**: Zod (via `src/lib/validation.ts`)
- **Analytics**: Custom price engine (`src/lib/price-analytics.ts`)
- **Matching**: Need-to-product matcher (`src/lib/match-engine.ts`)

### Core Architecture
```
src/
├── app/                 # Pages and API routes
│   ├── api/             # REST API handlers (shopping-list, receipts, products, prices, needs, mcp, dashboard, alerts)
│   ├── components/      # Reusable UI (stat-card, spending-chart)
│   └── [pages: lista, promocoes, produtos, notas, necessidades, login]  # Client-facing pages
├── lib/                 # Shared utilities
│   ├── utils.ts         # cn() classnames
│   ├── validation.ts    # sanitize, positiveNumber, etc.
│   ├── price-analytics.ts # getProductStats, isGoodDeal, getBestPrice
│   └── match-engine.ts  # matchProductToNeeds, getActiveNeeds
├── db/                  # Drizzle schema and seed
├── middleware.ts        # Auth & security headers
└── components/          # Global UI components
```

### Key APIs
All API routes support standard HTTP methods (GET, POST, PATCH, DELETE). Auth via `src/app/api/auth/[...all]`.

| Endpoint | Purpose | Key Exports |
|----------|---------|-------------|
| `/api/shopping-list` | Manage shopping lists | GET, POST, PATCH, DELETE |
| `/api/receipts` | Upload & list receipts | POST, GET |
| `/api/products` | Product catalog | GET |
| `/api/prices` | Price tracking & history | POST, GET (`/history/[productId]`) |
| `/api/needs` | User needs & matching | GET, POST, PUT, DELETE (`/[id]`) |
| `/api/mcp` | Multi-cloud proxy? | POST, GET, DELETE |
| `/api/dashboard` | Aggregated stats | GET |
| `/api/alerts` | Deal notifications | GET |
| `/api/analytics/[productId]` | Product insights | GET |

### Public Library Exports
- **Utils**: `cn`, `sanitize`, `positiveNumber`, `positiveInt`, `safeError`
- **Analytics**: `ProductStats` interface, `getProductStats`, `isGoodDeal`, `getBestPrice`
- **Matching**: `matchProductToNeeds`, `getActiveNeeds`, `matchAndPersist`, `rematchAllProducts`
- **UI**: `SpendingChart`, `RootLayout`

## Core Guides
- **[Project Overview](./project-overview.md)**: Features, roadmap, business goals
- **[Architecture Notes](./architecture.md)**: Deep dive into layers, data flow, dependencies
- **[Development Workflow](./development-workflow.md)**: Setup, branching, PR process, CI/CD
- **[Testing Strategy](./testing-strategy.md)**: Unit/integration tests, E2E, coverage
- **[Glossary & Domain Concepts](./glossary.md)**: Needs, Products, Deals, normalized prices
- **[Data Flow & Integrations](./data-flow.md)**: DB schema, API contracts, external services (MCP?)
- **[Security & Compliance](./security.md)**: Auth middleware, validation, headers
- **[Tooling Guide](./tooling.md)**: pnpm, ESLint, Drizzle, Tailwind, dev scripts

## Repository Snapshot
```
.
├── CLAUDE.md
├── components.json          # shadcn/ui config
├── drizzle.config.ts        # DB migrations
├── eslint.config.mjs
├── next.config.ts
├── package.json
├── pnpm-workspace.yaml
├── postcss.config.mjs
├── public/                  # Static assets
├── README.md                # Main project README
├── SECURITY_AUDIT.md
├── src/                     # App source (see architecture)
├── tsconfig.json
└── ... (db/, docs/)
```

## Symbol Glossary (Top Exports)
### Interfaces
- `ProductStats`: Price trend, avg, min/max (`src/lib/price-analytics.ts`)
- `NeedRecord`, `MatchResult`: Matching logic (`src/lib/match-engine.ts`)
- `DashboardData`, `SpendingData`: UI props

### Functions
- Price engine: `getProductStats(productId)`, `isGoodDeal(price, stats)`
- Matching: `matchProductToNeeds(product)`, `getActiveNeeds()`
- Utils: `cn(...classes)`, `sanitize(input)`

## Contributing
1. Fork & branch: `feat/your-feature`
2. Run `pnpm dev` for local dev
3. Test with `pnpm test`
4. Update docs as needed
5. PR with changelog

For issues, see [SECURITY_AUDIT.md](../SECURITY_AUDIT.md) or open a ticket.

---

*Last updated: Auto-generated from codebase analysis.*
