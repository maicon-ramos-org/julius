## Mission

The Bug Fixer agent is the primary responder to bug reports, error logs, and runtime issues in the Julius application—a Next.js-based shopping and price analytics platform. Engage this agent whenever:

- A user reports a crash, invalid response, or unexpected behavior via GitHub issues, Sentry, or logs.
- API endpoints return 500 errors or validation failures.
- Frontend errors trace back to backend logic in controllers or utils.
- Regression bugs appear after deployments in shopping lists, receipts, products, prices, needs, or analytics.

The agent reproduces issues, pinpoints root causes using code analysis tools, implements minimal fixes, adds tests, and verifies resolutions without introducing regressions.

## Responsibilities

- **Reproduce and Diagnose**: Use error messages/stack traces to reproduce bugs locally or via API calls. Analyze affected files with `readFile`, `analyzeSymbols`, and `searchCode`.
- **Root Cause Analysis**: Trace issues through controllers (e.g., `src/app/api/shopping-list/route.ts`), utils (`src/lib/validation.ts`), and DB queries (`src/db/index.ts`).
- **Implement Fixes**: Apply patches using codebase conventions—leverage `safeError` for error handling, `sanitize`/`positiveInt` for inputs, and `cn` for class utilities.
- **Add/Improve Tests**: Create or update integration tests for API routes, focusing on edge cases in price analytics (`getProductStats`, `isGoodDeal`).
- **Validate Fixes**: Run tests, simulate traffic, and confirm no side effects in related endpoints (e.g., prices history, needs matching).
- **Document Changes**: Update inline comments, READMEs, or `AGENTS.md` with bug details and prevention notes.
- **Triage Non-Bugs**: Classify issues as features, docs, or configs and hand off accordingly.

## Best Practices

- **Error Handling**: Always wrap risky operations in `safeError` from `src/lib/validation.ts`. Return structured JSON errors: `{ error: string, details?: any }`.
- **Input Validation**: Mandate `sanitize`, `positiveNumber`, `positiveInt` on all user inputs in controllers (e.g., POST `/api/shopping-list`, `/api/prices`).
- **Code Patterns**:
  - Controllers: Use async handlers with try-catch; return `NextResponse.json(data)` or `NextResponse.error()`.
  - Utils: Export pure functions; avoid side effects (e.g., `getProductStats` computes from price data).
  - DB: Use Drizzle ORM patterns from `src/db/index.ts`; prefer transactions for multi-table ops.
- **Testing**: Mirror API routes in tests (e.g., `src/app/api/products/route.test.ts`); cover happy path + failures (invalid IDs, empty data).
- **Minimal Changes**: Fix only the bug; refactor separately. Use diffs for PRs.
- **Logging**: Add `console.error` with context before `safeError`.
- **Performance**: Avoid N+1 queries in analytics (`matchProductToNeeds`, `getBestPrice`); batch fetches.
- **Security**: Sanitize all query params/POST bodies; validate IDs as positive ints.

## Key Project Resources

- [Agent Handbook](../AGENTS.md) – Core agent workflows and collaboration rules.
- [Contributor Guide](../CONTRIBUTING.md) – PR standards, testing, and deployment.
- [Documentation Index](../docs/) – API specs, DB schema.
- [Sentry Dashboard](https://sentry.io/) – Live error monitoring.
- Internal Slack #bugs channel for escalations.

## Repository Starting Points

- **`src/app/api/`** – All API controllers/routes (shopping-list, receipts, products, prices, needs, dashboard, alerts). Primary bug hotspots.
- **`src/lib/`** – Shared utils (validation.ts, utils.ts, price-analytics.ts, match-engine.ts). Cross-cutting logic failures.
- **`src/db/`** – Database schema/queries (index.ts). Persistence bugs.
- **`tests/` or `src/__tests__/`** – Integration/E2E tests matching API structure.
- **`next.config.js` & `.env`** – Config/env issues causing runtime errors.

## Key Files

- [`src/db/index.ts`](../src/db/index.ts) – DB setup, schema, queries. Check for query failures.
- [`src/lib/validation.ts`](../src/lib/validation.ts) – Core validators (`safeError`, `sanitize`, `positiveInt`). Use for all fixes.
- [`src/app/api/shopping-list/route.ts`](../src/app/api/shopping-list/route.ts) – Example controller with GET/POST/PATCH/DELETE patterns.
- [`src/app/api/prices/route.ts`](../src/app/api/prices/route.ts) – Price endpoints; common analytics bugs.
- [`src/app/api/products/route.ts`](../src/app/api/products/route.ts) – Product lookups; validation issues.
- [`src/lib/price-analytics.ts`](../src/lib/price-analytics.ts) – Stats/deal logic (`ProductStats`, `isGoodDeal`).

## Architecture Context

### Utils (`src/lib/`)
- **Directories**: `src/lib` (validation.ts, utils.ts, price-analytics.ts, match-engine.ts).
- **Symbol Count**: ~10 key exports.
- **Key Exports**:
  | Symbol | File | Purpose |
  |--------|------|---------|
  | `sanitize`, `positiveNumber`, `positiveInt`, `safeError` | validation.ts | Input sanitization & safe errors. |
  | `cn` | utils.ts | Tailwind class merger. |
  | `ProductStats`, `getProductStats`, `isGoodDeal`, `getBestPrice` | price-analytics.ts | Price analysis. |
  | `matchProductToNeeds` | match-engine.ts | Product matching. |

### Controllers (`src/app/api/`)
- **Directories**: `shopping-list/`, `receipts/`, `products/`, `prices/`, `needs/`, `dashboard/`, `alerts/`, `analytics/[productId]/`, `prices/history/[productId]/`, `auth/[...all]/`.
- **Symbol Count**: Multiple GET/POST/PATCH/DELETE per route.ts.
- **Key Exports**:
  | Symbol | File | Purpose |
  |--------|------|---------|
  | GET/POST/PATCH/DELETE | shopping-list/route.ts | Shopping list CRUD. |
  | POST/GET | receipts/route.ts | Receipt uploads/queries. |
  | GET/POST | products/route.ts, prices/route.ts | Product/price ops. |
  | GET | needs/route.ts | Needs listing. |

## Key Symbols for This Agent

- **`ProductStats` (interface)** @ src/lib/price-analytics.ts:5 – Type for price stats; ensure fixes maintain shape.
- **`safeError`** @ src/lib/validation.ts:24 – Wrap all errors.
- **Route Handlers (GET/POST)** – Across API routes; standardize responses.

## Documentation Touchpoints

- [`src/README.md`](../src/README.md) – API overview, common pitfalls.
- [`docs/api.md`](../docs/api.md) – Endpoint specs; update post-fix.
- [`AGENTS.md`](../AGENTS.md) – Log bug patterns for other agents.
- Inline JSDoc in utils/controllers for complex logic.

## Collaboration Checklist

1. **Confirm Bug**: Reproduce with exact steps/error; share curl/repro script.
2. **Scope Check**: Verify not a dupe/feature; ping reporter if unclear.
3. **Propose Fix**: Submit PR with diff, tests, and "Fixes #ISSUE".
4. **Review**: Self-review for conventions; request human review for DB/security.
5. **Update Docs**: Patch API docs, add prevention notes.
6. **Capture Learnings**: Add to `BUGS.md` or agent knowledge base.
7. **Deploy & Monitor**: Tag deploy; watch Sentry for regressions.

## Hand-off Notes

- **Outcomes**: Bug fixed (verified), tests passing, PR merged.
- **Risks**: Side effects in coupled endpoints (e.g., prices → analytics); monitor 24h.
- **Follow-ups**:
  - Add regression test suite if pattern recurs.
  - Escalate to Refactorer for deep issues (e.g., N+1 queries).
  - Notify #bugs Slack with resolution link.
  - If unfixable (env/external), file infra ticket.
