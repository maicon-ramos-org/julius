## Testing Strategy

Quality in the Julius codebase is maintained through a balanced testing pyramid emphasizing unit, integration, and end-to-end (E2E) tests, combined with static analysis and CI/CD pipelines. We prioritize fast, reliable unit tests for pure functions and utilities (e.g., `matchProductToNeeds` in `src/lib/match-engine.ts` and `getProductStats` in `src/lib/price-analytics.ts`), integration tests for API routes (e.g., shopping list, needs, and prices endpoints), and E2E tests for critical user flows like login, dashboard rendering, and receipt uploads.

Tests are colocated with source files using `*.test.ts` naming to encourage ownership. Coverage is enforced at 80%+ for new code, with type safety via TypeScript and runtime validation (e.g., `sanitize`, `positiveNumber` from `src/lib/validation.ts`) reducing edge cases. Linting (ESLint), formatting (Prettier), and security scans run pre-commit and in CI. For full workflow integration, see [development-workflow.md](./development-workflow.md).

## Test Types

- **Unit**: Jest with TypeScript support via `ts-jest`. Targets pure functions, utils, and components (e.g., `SpendingChart`). Files named `*.test.ts` colocated with source (e.g., `match-engine.test.ts` next to `match-engine.ts`). Use `@testing-library/react` for hooks/components. Mock dependencies like `getDb` explicitly.
- **Integration**: Jest + Supertest for API routes (e.g., `POST /api/prices`, `GET /api/dashboard`). Tests database interactions with an in-memory SQLite instance (via `src/db/index.ts`). Files named `*.integration.test.ts` in `__tests__` folders within `src/app/api`. Covers auth middleware and validation schemas.
- **E2E**: Playwright for browser automation. Tests full flows like creating needs (`POST /api/needs`), matching products, and UI interactions (e.g., `RootLayout`, `LoginLayout`). Files in `e2e/*.spec.ts`. Run against staging-like environment with seeded data (`src/db/seed.ts`). Headless by default; headed for debugging.

## Running Tests

- All tests: `npm run test`
- Watch mode: `npm run test:watch`
- Coverage: `npm run test:coverage`
  ```bash
  npm run test:coverage -- --coverageReporters=html
  # Opens interactive report in browser
  ```
- Specific suite: `npm run test -- src/lib/match-engine.test.ts`
- E2E only: `npx playwright test`
- Update snapshots: `npm run test -- -u`
- Lint + format check: `npm run lint && npm run format:check`

## Quality Gates

- **Coverage**: 80% statements/branches/functions minimum overall; 90% for new/changed lines (enforced via `jest --coverage --collectCoverageFrom="src/**/*.{ts,tsx}" --coverageThreshold` in CI).
- **Linting**: ESLint must pass (`eslint src/ --max-warnings=0`). No unused vars, consistent imports.
- **Formatting**: Prettier auto-format on save; `prettier --check .` fails CI if dirty.
- **TypeScript**: `tsc --noEmit` strict mode.
- **Security**: `npm audit` and Snyk scans in CI; no secrets in tests.
- **CI/CD**: GitHub Actions blocks merge on failures. PR checks include test matrix (Node 20/22), coverage diff via Codecov.

## Troubleshooting

- **Flaky E2E**: Network timeouts on `/api/mcp` (MCP proxy); increase `playwright.config.ts` timeout to 30s or mock external calls.
- **Long-running integration**: Database seeding (`src/db/seed.ts`) slows suites; use `beforeEach` with transaction rollback.
- **Coverage gaps**: Utils like `cn` from `src/lib/utils.ts` often missed—add explicit tests for class merging.
- **Watch mode stalls**: Clear Jest cache `npx jest --clearCache`. Ensure `tsconfig.json` paths align.
- **Playwright browser issues**: `npx playwright install --with-deps` on new envs.

## Related Resources

- [development-workflow.md](./development-workflow.md)
