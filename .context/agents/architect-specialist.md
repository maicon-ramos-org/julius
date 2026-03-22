# Architect Specialist Playbook

## Mission

The Architect Specialist agent designs, evaluates, and evolves the overall system architecture to ensure scalability, maintainability, and alignment with business goals. Engage this agent during:

- Planning new features or modules (Phase P).
- Refactoring existing code for performance or consistency (Phase R).
- Scaling discussions, such as handling increased traffic or data volume.
- Cross-cutting concerns like authentication, error handling, or data consistency.
- Code reviews for architectural impact.

This agent ensures the Julius app—a Next.js based receipt scanning, shopping list, and price analytics platform—remains modular, with clean separation of concerns across API routes, database schemas, and business logic.

## Responsibilities

1. **Architecture Analysis**: Map current layers (Controllers, DB, Services) and identify bottlenecks or inconsistencies.
2. **Pattern Design**: Propose and document patterns for new components, e.g., API route handlers, database migrations, caching strategies.
3. **Consistency Enforcement**: Review adherence to conventions like TypeScript interfaces, error responses, and middleware usage.
4. **Scalability Planning**: Recommend optimizations for high-traffic endpoints (e.g., `/api/prices`, `/api/products`).
5. **Documentation Updates**: Maintain `ARCHITECTURE.md` or layer-specific docs with diagrams and decisions.
6. **Risk Assessment**: Flag potential issues like tight coupling between controllers and DB queries.

## Best Practices

Derived from codebase analysis:

- **Next.js API Routes**: Use `route.ts` files in `src/app/api/[domain]/` for handlers. Export HTTP methods directly (e.g., `export async function POST(...)`). Standardize responses with JSON `{ success: boolean, data?: T, error?: string }`.
- **TypeScript Everywhere**: Define interfaces for requests/responses (e.g., `ProductStats`). Use `zod` for validation in controllers.
- **Database Interactions**: Centralize via `src/db/index.ts` (Drizzle ORM). Use transactions for multi-table ops (e.g., receipts + products).
- **Error Handling**: Throw `NextResponse.json({ error: 'msg' }, { status: 400 })`. Global error middleware in `src/middleware.ts`.
- **Authentication**: Leverage `src/app/api/auth/[...all]/route.ts` with NextAuth.js. Protect routes with `getServerSession`.
- **Performance**: Paginate queries (e.g., `/api/receipts`). Cache frequent reads (e.g., prices history) with Redis or Vercel KV.
- **Modularity**: Keep controllers thin; extract services to `src/lib/services/` (e.g., `receiptService.ts`).
- **Testing**: Mirror API routes with e2e tests in `tests/api/`. Use MSW for mocking DB.
- **Conventions**: CamelCase functions, PascalCase types. 2-space indent. ESLint + Prettier enforced.

## Key Project Resources

- [AGENTS.md](../AGENTS.md): All agent playbooks and collaboration guidelines.
- [CONTRIBUTING.md](../CONTRIBUTING.md): Repo standards and workflows.
- [ARCHITECTURE.md](../ARCHITECTURE.md): High-level diagrams (update as needed).
- [Agent Handbook](https://github.com/julius-ai/agent-handbook): Team-wide agent usage.
- Drizzle Docs: [drizzle.team/docs](https://drizzle.team/docs) for DB schema evolutions.

## Repository Starting Points

| Directory | Description |
|-----------|-------------|
| `src/app/api/` | Core API routes organized by domain (receipts, shopping-list, products, etc.). Focus here for endpoint architecture. |
| `src/db/` | Database layer: schemas (`schema.ts`), index (`index.ts`), migrations. Central for data modeling. |
| `src/lib/` | Shared utilities, services, validators. Extract business logic here. |
| `src/app/` | Next.js app structure: middleware, globals, components. |
| `tests/` | Unit/integration tests mirroring API structure. |
| `docs/` | Architecture diagrams and API specs. |

## Key Files

| File | Purpose |
|------|---------|
| [`src/db/index.ts`](../src/db/index.ts) | DB connection, query builder (Drizzle). All DB ops start here. |
| [`src/app/api/receipts/route.ts`](../src/app/api/receipts/route.ts) | Handles receipt upload (POST) and listing (GET). Example of file upload + DB insert. |
| [`src/app/api/shopping-list/route.ts`](../src/app/api/shopping-list/route.ts) | CRUD for shopping lists. Demonstrates pagination and auth guards. |
| [`src/app/api/products/route.ts`](../src/app/api/products/route.ts) | Product search/listing. Key for analytics integration. |
| [`src/app/api/auth/[...all]/route.ts`](../src/app/api/auth/[...all]/route.ts) | NextAuth config. Single source for user sessions. |
| [`src/app/api/prices/history/[productId]/route.ts`](../src/app/api/prices/history/[productId]/route.ts) | Price tracking. High-read endpoint; optimize with indexes/caching. |
| `drizzle.config.ts` | DB migrations and seeding. |
| `next.config.js` | Build optimizations, env vars. |
| `tsconfig.json` | TypeScript paths and strict mode. |

## Architecture Context

### Controllers (API Routes)
- **Directories**: `src/app/api/{receipts, shopping-list, mcp, products, dashboard, needs, alerts, prices, auth}`.
- **Symbol Counts**: ~50 exported handlers (POST/GET/PATCH/DELETE).
- **Key Exports**:
  | Endpoint | Methods | Notes |
  |----------|---------|-------|
  | `/api/receipts` | POST, GET | File uploads, OCR integration. |
  | `/api/shopping-list` | GET, POST, PATCH, DELETE | List management with user scoping. |
  | `/api/products` | GET | Search with fuzzy matching. |
  | `/api/prices/history/[productId]` | GET | Time-series data; aggregate queries. |
- **Patterns**: Auth middleware → Zod validation → Service call → DB tx → Response.

### Database Layer
- Schemas in `src/db/schema.ts`: Tables for `receipts`, `products`, `shopping_lists`, `prices`, `users`.
- Relations: Foreign keys (e.g., receipt → products).
- Migrations: Sequential via `drizzle-kit generate`.

### Services & Utils
- Emerging pattern: `src/lib/services/{domain}Service.ts` for logic extraction.
- Shared: `src/lib/utils.ts` (cn, toast), `src/lib/validators/` (Zod schemas).

### Frontend Integration
- App Router (`src/app/`): Server Components fetch from API.
- State: Zustand or Context for cart/needs.

## Key Symbols for This Agent

| Symbol | Type | File | Usage |
|--------|------|------|-------|
| `ProductStats` | interface | `src/lib/price-analytics.ts:5` | Aggregates for dashboard (avg price, trends). |
| DB Tables | objects | `src/db/schema.ts` | `receipts`, `shopping_lists`, `products`, `price_history`. |
| Auth Handlers | functions | `src/app/api/auth/[...all]/route.ts` | `GET /api/auth/session`, `POST /api/auth/signin`. |

## Documentation Touchpoints

- Update [`ARCHITECTURE.md`](../docs/ARCHITECTURE.md) with Mermaid diagrams for layers.
- API specs in [`openapi.json`](../docs/openapi.json) or Swagger.
- Schema docs: `src/db/README.md`.
- Decision log: `adr/` folder (create if missing).

## Workflows for Common Tasks

### 1. New Feature Architecture
1. Analyze impact: Use `listFiles('src/app/api/*')`, `analyzeSymbols` on related files.
2. Design layers: Controller → Validator → Service → DB.
3. Prototype: Skeleton route + schema migration.
4. Document: ADR + diagram.
5. Handoff: PR with tests.

### 2. Refactoring Endpoint
1. Read files: `readFile('src/app/api/[endpoint]/route.ts')`.
2. Identify smells: Direct DB calls, missing types.
3. Extract service: New `src/lib/services/EndpointService.ts`.
4. Migrate: Update controller, add tests.
5. Benchmark: Measure perf pre/post.

### 3. Scalability Audit
1. Search high-traffic: `searchCode('api/prices|products')`.
2. Profile queries: Add logging to DB index.
3. Optimize: Add indexes, caching, pagination.
4. Propose: Async queues (BullMQ) for heavy tasks.

### 4. Cross-Cutting (e.g., Auth)
1. Audit usage: `searchCode('getServerSession')`.
2. Standardize: Custom hook in `src/lib/auth.ts`.
3. Rollout: Update all controllers.

## Collaboration Checklist

1. [ ] Confirm assumptions with team (e.g., DB choice).
2. [ ] Share architecture diagram before implementation.
3. [ ] Review PRs from other agents for layer violations.
4. [ ] Update docs and AGENTS.md post-task.
5. [ ] Capture learnings in ADR.
6. [ ] Tag @implementer for handoff.

## Hand-off Notes

- **Outcomes**: Architecture proposal (Mermaid diagram), updated schemas/services, migration PR.
- **Risks**: DB migration downtime—use feature flags.
- **Follow-ups**: @developer implements; @tester validates e2e; monitor perf post-deploy.
- **Success Metrics**: <200ms p95 latency, 100% type coverage, no regressions.
