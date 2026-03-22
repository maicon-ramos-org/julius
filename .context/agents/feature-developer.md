## Mission

The Feature Developer agent is responsible for turning high-level feature specifications into production-ready code. It is engaged after the Architect agent has defined the feature requirements, data models, and integration points. This agent focuses on implementing new API routes, UI components, and integrations while adhering to the codebase's Next.js App Router structure, shadcn/ui patterns, and TypeScript conventions. Common use cases include adding shopping list management, receipt processing, product pricing features, or dashboard analytics.

## Responsibilities

- **Implement API Endpoints**: Create or extend route handlers in `src/app/api/[module]/route.ts` for CRUD operations (e.g., GET/POST/PATCH/DELETE for shopping lists, receipts, products).
- **Build UI Components**: Develop or update pages in `src/app/[module]` and reusable components in `src/components/` or `src/components/ui/`, using shadcn/ui primitives like `Sheet`, `Dialog`, `Input`, `DropdownMenu`, `Checkbox`, and `Badge`.
- **Integrate with Data Layer**: Use `src/db/index.ts` for database operations, ensuring Drizzle ORM schemas and queries align with existing patterns.
- **Add Client-Side Logic**: Implement React hooks, state management (e.g., Zustand or Context if present), and API calls with libraries like TanStack Query.
- **Write Tests**: Add unit/integration tests matching patterns in test files (e.g., Vitest or Playwright).
- **Update Documentation**: Extend READMEs, API docs, or inline JSDoc for new features.
- **Refactor for Consistency**: Apply code patterns like async route handlers, Zod validation, and error responses.

**Common Task Workflows**:

1. **New API Feature (e.g., New Endpoint for Needs)**:
   - Analyze existing routes (e.g., `src/app/api/needs/route.ts`).
   - Create `src/app/api/needs/[action]/route.ts`.
   - Implement handlers: `export async function GET(request: Request) { ... }`.
   - Add Zod schema validation.
   - Integrate DB queries via `src/db/index.ts`.

2. **New UI Page (e.g., Shopping List View)**:
   - Create `src/app/lista/page.tsx`.
   - Fetch data with `useSWR` or `fetch` in Server Components.
   - Compose with `StatCard`, `SpendingChart`, sheets, and dialogs.
   - Ensure responsive design with Tailwind.

3. **Component Enhancement**:
   - Extend `src/components/` (e.g., new chart variant).
   - Export typed props (e.g., `interface SpendingData { ... }`).
   - Use Recharts or similar for charts.

4. **Full Feature Rollout**:
   - Phase P: Plan file changes, sketch code structure.
   - Phase E: Implement, test locally, commit with conventional messages.

## Best Practices

- **File Structure**: Mirror existing patterns—API routes in `src/app/api/[plural]/[id]/route.ts`; pages in `src/app/[kebab-case]/page.tsx`; UI primitives in `src/components/ui/`.
- **Naming Conventions**: Kebab-case directories, PascalCase components/exports, camelCase functions.
- **TypeScript**: Always type props (e.g., `StatCardProps`), use interfaces for data shapes (e.g., `SpendingData`), infer where possible.
- **Validation & Errors**: Zod for request parsing; standardize responses `{ data: ..., error: null }` or throw `NextResponse.json({ error: '...' }, { status: 400 })`.
- **UI Patterns**: Favor Server Components; use shadcn/ui composables (`SheetTrigger`, `DialogPortal`); Tailwind for styling; accessibility via ARIA.
- **Performance**: Streaming, Suspense for data fetching; avoid useEffect waterfalls.
- **Testing**: Colocate tests (e.g., `*.test.tsx`); mock DB with `vi.mock('src/db/index.ts')`.
- **Commits**: `feat: add shopping list endpoint`; reference tickets.
- **Code Style**: ESLint/Prettier enforced; 2-space indent; no console.logs in prod code.

## Key Project Resources

- [AGENTS.md](../AGENTS.md) - Agent roles and handoffs.
- [Contributor Guide](../CONTRIBUTING.md) - Setup, PR process.
- [Agent Handbook](../docs/agents-handbook.md) - Collaboration protocols.
- [API Documentation](../docs/api.md) - Endpoint specs.

## Repository Starting Points

- `src/app/api/` - API routes (shopping-list, receipts, products, prices, needs, dashboard).
- `src/app/` - Pages and layouts (promocoes, produtos, notas, login, necessidades, lista).
- `src/components/` - Reusable UI (stat-card.tsx, spending-chart.tsx, ui/ primitives).
- `src/db/` - Database layer (index.ts for schema/queries).
- `src/lib/` - Utilities (validation, auth, utils).
- `tests/` or `__tests__/` - Test suites.

## Key Files

| File | Purpose |
|------|---------|
| [`src/app/api/shopping-list/route.ts`](../src/app/api/shopping-list/route.ts) | Core CRUD for shopping lists (GET/POST/PATCH/DELETE). |
| [`src/app/api/receipts/route.ts`](../src/app/api/receipts/route.ts) | Receipt upload and retrieval. |
| [`src/components/stat-card.tsx`](../src/components/stat-card.tsx) | Dashboard stat display (`StatCardProps`). |
| [`src/components/spending-chart.tsx`](../src/components/spending-chart.tsx) | Chart component (`SpendingChart`, `SpendingData`). |
| [`src/components/ui/sheet.tsx`](../src/components/ui/sheet.tsx) | Side sheet (`Sheet`, `SheetTrigger`, `SheetClose`). |
| [`src/components/ui/dialog.tsx`](../src/components/ui/dialog.tsx) | Modal dialogs (`Dialog`, `DialogTrigger`). |
| [`src/components/ui/input.tsx`](../src/components/ui/input.tsx) | Form inputs. |
| [`src/components/ui/dropdown-menu.tsx`](../src/components/ui/dropdown-menu.tsx) | Menus and selectors (`DropdownMenuCheckboxItem`). |
| [`src/db/index.ts`](../src/db/index.ts) | DB connection, schemas, queries (Drizzle). |

## Architecture Context

### Controllers (API Layer)
- **Directories**: `src/app/api/shopping-list`, `src/app/api/receipts`, `src/app/api/products`, `src/app/api/prices`, `src/app/api/needs`, `src/app/api/dashboard`, `src/app/api/alerts`, etc.
- **Patterns**: Async exported handlers (e.g., `GET`, `POST`); Zod validation; DB txns.
- **Key Exports** (20+ handlers): `GET/POST/PATCH/DELETE` @ shopping-list/route.ts; `POST` @ receipts/route.ts; etc.

### Components (UI Layer)
- **Directories**: `src/components/`, `src/components/ui/`, `src/app/[module]/`.
- **Patterns**: ForwardRef composables; Tailwind + shadcn/ui; typed props.
- **Key Exports** (30+ symbols): `SpendingChart`, `StatCardProps`, `Sheet*`, `Dialog*`, `Input`, `DropdownMenu*`, `Checkbox`, `Badge`.

### Data Layer
- `src/db/index.ts`: Central Drizzle hub.

## Key Symbols for This Agent

- `StatCardProps` (interface) @ src/components/stat-card.tsx:4 - Props for stat cards.
- `SpendingData` (type) @ src/components/spending-chart.tsx:6 - Chart data shape.
- `SpendingChart` (component) @ src/components/spending-chart.tsx:12 - Reusable chart.
- `Sheet`, `SheetTrigger`, `SheetClose`, `SheetPortal` @ src/components/ui/sheet.tsx - Drawer primitives.
- `Dialog`, `DialogTrigger`, `DialogPortal`, `DialogClose` @ src/components/ui/dialog.tsx - Modal primitives.
- `Input` @ src/components/ui/input.tsx:6 - Form input.
- `DropdownMenu*` variants @ src/components/ui/dropdown-menu.tsx - Menus/selectors.
- `Checkbox`, `Badge` @ ui/checkbox.tsx, ui/badge.tsx - Controls.

## Documentation Touchpoints

- Update `src/app/api/[new]/route.ts` JSDoc for new endpoints.
- Extend [`docs/api.md`](../docs/api.md) with OpenAPI snippets.
- Add component stories in `src/components/[new].stories.tsx`.
- Reference [`ARCHITECTURE.md`](../ARCHITECTURE.md) for layers.

## Collaboration Checklist

1. [ ] Confirm feature spec with Architect agent (data models, endpoints).
2. [ ] List modified files and rationale in planning phase.
3. [ ] Implement in isolated branch; run `npm test`, `npm lint`.
4. [ ] Self-review: Types check? UI responsive? Errors handled?
5. [ ] Request code review from Maintainer; address feedback.
6. [ ] Update docs and tests.
7. [ ] Merge via PR; notify Deployer.

## Hand-off Notes

- **Outcomes**: Feature implemented, tested, documented; PR linked.
- **Risks**: DB migrations needed? Auth changes? Performance on large datasets?
- **Follow-ups**: Architect verifies integration; Tester runs E2E; Deployer stages release. Capture learnings in `LEARNINGS.md`.
