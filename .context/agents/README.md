# Feature Developer Playbook

This playbook guides the Feature Developer agent in implementing new features for the Julius application, a Next.js (App Router) web app focused on shopping lists, receipts, products, prices, needs, alerts, dashboard, and analytics. Features typically involve backend API enhancements (e.g., CRUD for shopping lists, prices) and frontend UI updates using React components with shadcn/ui primitives.

## Core Responsibilities
- Analyze feature specifications and break them into backend (API routes) and frontend (pages/components) changes.
- Implement full-stack features: API endpoints + UI integration.
- Ensure features integrate seamlessly with existing auth (src/app/api/auth/[...all]), data flows (e.g., needs, products, prices), and UI patterns.
- Follow TypeScript strict typing, React hooks, and server actions where applicable.
- Avoid modifying core auth or unrelated modules unless specified.

## Key Files and Areas

### Backend: API Routes (Controllers)
**Primary Directory**: `src/app/api/`
- Handles all HTTP requests: shopping-list, receipts, products, prices, needs, mcp, dashboard, alerts, analytics.
- **Convention**: Single `route.ts` per endpoint directory exports named handlers (`GET`, `POST`, `PATCH`, `DELETE`).
- **Key Files and Purposes**:
  | File | Purpose | Key Exports |
  |------|---------|-------------|
  | `src/app/api/shopping-list/route.ts` | CRUD for shopping lists | `GET`, `POST`, `PATCH`, `DELETE` |
  | `src/app/api/receipts/route.ts` | Receipt upload/retrieval | `POST` (upload), `GET` (list) |
  | `src/app/api/products/route.ts` | Product management | `GET` |
  | `src/app/api/prices/route.ts` | Price submission/history | `POST` (submit), `GET` (current/history) |
  | `src/app/api/needs/route.ts` | Needs listing | `GET` |
  | `src/app/api/needs/[id]/route.ts` | Specific need operations | Dynamic route handlers |
  | `src/app/api/prices/history/[productId]/route.ts` | Price history per product | `GET` |
  | `src/app/api/analytics/[productId]/route.ts` | Product analytics | `GET` |
  | `src/app/api/auth/[...all]/route.ts` | Authentication (do not modify) | Core auth handlers |
  | `src/app/api/dashboard/route.ts` | Dashboard data aggregation | Aggregated queries |

### Frontend: Pages and Components
**Primary Directories**: `src/app/` (pages), `src/components/`, `src/components/ui/` (shadcn/ui primitives)
- Pages: `src/app/promocoes`, `src/app/produtos`, `src/app/notas`, `src/app/necessidades`, `src/app/lista`, `src/app/login`.
- **Key Files and Purposes**:
  | File | Purpose | Key Symbols/Exports |
  |------|---------|---------------------|
  | `src/components/stat-card.tsx` | Reusable stat display cards | `StatCardProps` |
  | `src/components/spending-chart.tsx` | Spending visualization | `SpendingData`, `SpendingChart` |
  | `src/components/ui/sheet.tsx` | Side sheets/drawers | `Sheet`, `SheetTrigger`, `SheetClose`, `SheetPortal` |
  | `src/components/ui/input.tsx` | Form inputs | `Input` |
  | `src/components/ui/dropdown-menu.tsx` | Dropdowns with checkboxes/radios | `DropdownMenu*` components (e.g., `DropdownMenuTrigger`, `DropdownMenuCheckboxItem`) |
  | `src/components/ui/dialog.tsx` | Modals | `Dialog`, `DialogTrigger`, `DialogClose` |
  | `src/components/ui/checkbox.tsx` | Checkboxes | `Checkbox` |
  | `src/components/ui/badge.tsx` | Badges/labels | `Badge` |

**Data Flow**: Pages fetch from API routes via `fetch` or SWR/TanStack Query (infer from patterns). Use `useState`, `useEffect`, React Server Components where possible.

## Code Patterns and Conventions
- **API Handlers**:
  ```ts
  // Example from shopping-list/route.ts
  export async function GET(request: Request) {
    // Auth check, query params via URLSearchParams
    const { searchParams } = new URL(request.url);
    // Database query (likely Prisma/Postgres)
    return Response.json(data);
  }
  export async function POST(request: Request) {
    const body = await request.json();
    // Validation (Zod?), DB ops, return { success, data }
  }
  ```
  - Always handle auth (session/user ID).
  - Use `NextResponse.json()` or `Response.json()`.
  - Error: `NextResponse.json({ error: 'msg' }, { status: 400 })`.

- **Components**:
  ```tsx
  // Functional components with interfaces
  interface StatCardProps { title: string; value: number; /* ... */ }
  export function StatCard({ title, value }: StatCardProps) {
    return <div className="...">{/* Tailwind + shadcn */}</div>;
  }
  ```
  - Tailwind CSS classes.
  - shadcn/ui composition: Wrap primitives (e.g., `<Sheet><SheetTrigger>...<SheetContent>...</Sheet>`).
  - Hooks: `useState` for local state, `fetch` for API calls.

- **TypeScript**: Strict interfaces for props/req bodies. Infer DB types from Prisma schema (assume `src/lib/db.ts` or similar).
- **Styling**: Tailwind + CSS modules if needed; consistent with shadcn (e.g., `cn()` utility for class merging).

## Workflows for Common Tasks

### 1. Implementing a New API Endpoint (e.g., New CRUD for "alerts")
1. Identify route path (e.g., `src/app/api/alerts/route.ts`).
2. Export handlers matching HTTP method (e.g., `POST` for create).
3. Add auth: Extract user from session/cookies.
4. Validate input: Use Zod schema, parse `request.json()`.
5. DB ops: Use Prisma client (query/create/update/delete).
6. Handle errors: Specific status codes, JSON responses.
7. Test manually: `curl` or Postman.

### 2. Adding a New UI Page or Feature (e.g., Alerts Dashboard)
1. Create/update page in `src/app/alerts/page.tsx` (Server Component default).
2. Fetch data: `async function Page() { const data = await fetch('/api/alerts').then(res => res.json()); }`.
3. Compose UI: Use `StatCard`, `SpendingChart`, sheets/dialogs for modals.
4. Forms: `<form action={serverAction}>` or client-side `fetch` with `useTransition`.
5. State management: `useState`/`useEffect` for lists; optimistic updates.
6. Mobile-responsive: Tailwind breakpoints.
7. Integrate charts: Extend `SpendingChart` pattern for new viz.

### 3. Full-Stack Feature (e.g., Add "Price Alerts" Feature)
1. **Plan**: Spec → Backend (new `/api/prices/alerts` route) + Frontend (sheet in products page).
2. Backend first: Implement CRUD, integrate with products/prices DB.
3. Frontend: Add `Sheet` with `DropdownMenuCheckboxItem` for filters, `Input` for thresholds.
4. Wire up: Button triggers API via `fetch`, update UI state.
5. Edge cases: Loading (`Suspense`), errors (toasts via sonner/react-hot-toast).
6. Polish: Badges for status, charts for trends.

### 4. Feature Iteration/Expansion
1. Read spec fully.
2. List changes: Files to add/modify (use context above).
3. Pseudocode first.
4. Implement incrementally: Backend → Frontend → Polish.
5. Self-review: Type check (`tsc`), lint (`eslint`), no console.logs.

## Best Practices from Codebase
- **Security**: Always validate/sanitize inputs; auth on all user routes.
- **Performance**: Paginate lists (`limit`, `offset`); cache with `revalidatePath`.
- **Accessibility**: shadcn/ui handles ARIA; add `aria-label` where custom.
- **Error Handling**: User-friendly messages; log to console/Sentry.
- **Testing**: Defer to Test Writer; add E2E seeds if critical.
- **Commits**: Feature branches; descriptive messages (e.g., "feat: add price alerts CRUD").
- **No Bloat**: Reuse components (e.g., `Sheet` for all side panels).

## Quick Reference
- **New Backend**: Copy `shopping-list/route.ts` pattern.
- **New UI**: Import shadcn primitives; extend `StatCard`/`SpendingChart`.
- **DB Assumptions**: Prisma models for ShoppingList, Receipt, Product, Price, Need.
- **Tools**: Use `readFile`/`analyzeSymbols` for deep dives.

Follow this playbook strictly for consistent, high-quality features. For reviews, hand off to Code Reviewer.
