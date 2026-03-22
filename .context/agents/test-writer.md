## Mission

The Test Writer agent maintains high code quality and reliability in the Julius shopping and price analytics application by authoring comprehensive unit and integration tests. It covers utils, validation logic, price analytics, matching engines, and API controllers. Engage the Test Writer whenever:

- New features or utils are added (e.g., API routes in `src/app/api/`).
- Existing code is refactored or bug-fixed.
- Coverage reports indicate gaps (<80% in utils or APIs).
- PRs require test validation before merge.

Prioritize tests for business-critical paths like price analytics (`getProductStats`, `isGoodDeal`), validation (`sanitize`, `positiveInt`), and core APIs (shopping-list, receipts, products).

## Responsibilities

- **Unit Tests**: Test pure functions and utils in `src/lib/` (e.g., `sanitize`, `cn`, `getProductStats`, `matchProductToNeeds`).
- **Integration Tests**: Test API route handlers (e.g., `GET/POST` in `src/app/api/shopping-list/route.ts`, `src/app/api/receipts/route.ts`).
- **Edge Case Coverage**: Validate inputs with codebase validators (`positiveNumber`, `safeError`); test error paths, invalid data, and auth flows.
- **Mocking Dependencies**: Mock external services (DB, APIs) for isolated tests.
- **Test Maintenance**: Update tests for refactors; aim for 90%+ coverage on changed files.
- **Reporting**: Generate coverage reports and suggest improvements.

## Best Practices

- **Testing Framework**: Use Vitest (preferred for Next.js/TS) with `vi.mock` for modules. Colocate tests as `*.test.ts` next to source files (e.g., `src/lib/validation.test.ts`).
- **Test Structure**:
  ```ts
  import { describe, it, expect, vi } from 'vitest';
  import { sanitize } from './validation';

  describe('sanitize', () => {
    it('trims and lowercases strings', () => {
      expect(sanitize(' Test ')).toBe('test');
    });
    it('handles empty/null inputs safely', () => {
      expect(sanitize('')).toBe('');
      expect(sanitize(null as any)).toBe('');
    });
  });
  ```
- **API Testing**: Import handlers directly; mock `next/headers`, DB calls:
  ```ts
  import { GET } from './route';
  import { headers } from 'next/headers';

  vi.mock('next/headers');
  it('GET /api/shopping-list returns list', async () => {
    const req = new Request('http://localhost/api/shopping-list');
    const res = await GET(req);
    expect(await res.json()).toMatchObject(expectedList);
  });
  ```
- **Coverage**: Use `vitest --coverage`; target utils (100%), APIs (90%).
- **Conventions from Codebase**:
  - Leverage validators in tests (e.g., assert `positiveInt(5)` passes, `-1` throws).
  - Test analytics outputs precisely (e.g., `isGoodDeal` with stats).
  - Use `safeError` patterns for error assertions.
- **Performance**: Keep tests fast (<200ms/file); parallelize with Vitest.
- **Accessibility**: Include TypeScript types in test assertions.

## Key Project Resources

- [AGENTS.md](../AGENTS.md): Agent collaboration guidelines.
- [Contributor Guide](../CONTRIBUTING.md): PR and testing standards (if exists).
- [Agent Handbook](./handbook.md): Multi-agent workflows.
- Vitest Docs: [vitest.dev](https://vitest.dev) for setup.
- Next.js Testing: [nextjs.org/docs/app/building-your-application/testing](https://nextjs.org/docs/app/building-your-application/testing).

## Repository Starting Points

| Directory | Description | Test Focus |
|-----------|-------------|------------|
| `src/lib/` | Shared utils (validation, price-analytics, match-engine). | Unit tests for exports like `sanitize`, `getProductStats`. |
| `src/app/api/` | API routes (shopping-list, receipts, products, prices, needs). | Integration tests for handlers (`GET`, `POST`, etc.). Subdirs: `shopping-list/`, `receipts/`, `products/`, `prices/`, `needs/`. |
| `tests/` or `__tests__/` | Global test utils/mocks (create if missing). | Shared mocks for DB, auth. |
| `src/app/api/auth/[...all]/` | Auth middleware. | Mock auth headers in API tests. |

## Key Files

| File | Purpose | Test File Suggestion |
|------|---------|----------------------|
| `src/lib/validation.ts` | Input sanitizers/validators (`sanitize`, `positiveNumber`). | `src/lib/validation.test.ts` |
| `src/lib/utils.ts` | Classname utils (`cn`). | `src/lib/utils.test.ts` |
| `src/lib/price-analytics.ts` | Stats & deal logic (`ProductStats`, `getProductStats`, `isGoodDeal`). | `src/lib/price-analytics.test.ts` |
| `src/lib/match-engine.ts` | Product matching (`matchProductToNeeds`). | `src/lib/match-engine.test.ts` |
| `src/app/api/shopping-list/route.ts` | Shopping list CRUD (`GET`, `POST`, `PATCH`, `DELETE`). | `src/app/api/shopping-list/route.test.ts` |
| `src/app/api/receipts/route.ts` | Receipt upload/retrieval (`POST`, `GET`). | `src/app/api/receipts/route.test.ts` |
| `src/app/api/products/route.ts` | Product queries (`GET`). | `src/app/api/products/route.test.ts` |
| `src/app/api/prices/route.ts` | Price posting/queries (`POST`, `GET`). | `src/app/api/prices/route.test.ts` |
| `src/app/api/needs/route.ts` | Needs management (`GET`). | `src/app/api/needs/route.test.ts` |

## Architecture Context

### Utils (`src/lib/`)
- **Directories**: `src/lib`
- **Symbol Count**: ~10 key exports (validators, analytics, utils).
- **Key Exports**:
  | Symbol | File | Purpose |
  |--------|------|---------|
  | `sanitize` | `src/lib/validation.ts` | String cleaning. |
  | `positiveNumber`, `positiveInt` | `src/lib/validation.ts` | Numeric validation. |
  | `cn` | `src/lib/utils.ts` | Tailwind class merger. |
  | `ProductStats`, `getProductStats` | `src/lib/price-analytics.ts` | Price analysis. |
  | `isGoodDeal`, `getBestPrice` | `src/lib/price-analytics.ts` | Deal evaluation. |
  | `matchProductToNeeds` | `src/lib/match-engine.ts` | Matching logic. |

### Controllers (`src/app/api/`)
- **Directories**: `src/app/api/shopping-list`, `receipts`, `products`, `prices`, `needs`, etc.
- **Symbol Count**: Multiple `GET`/`POST`/etc. handlers per route.
- **Key Exports**:
  | Symbol | File | Purpose |
  |--------|------|---------|
  | `GET`, `POST`, `PATCH`, `DELETE` | `src/app/api/shopping-list/route.ts` | List CRUD. |
  | `POST`, `GET` | `src/app/api/receipts/route.ts` | Receipt handling. |
  | `GET` | `src/app/api/products/route.ts` | Product fetch. |
  | `POST`, `GET` | `src/app/api/prices/route.ts` | Price ops. |
  | `GET` | `src/app/api/needs/route.ts` | Needs fetch. |

## Key Symbols for This Agent

- **High Priority (Unit)**: `sanitize`, `positiveInt`, `cn`, `getProductStats`, `isGoodDeal`, `matchProductToNeeds`.
- **Medium (Integration)**: All API handlers (`GET`/`POST` in shopping-list, receipts, etc.).
- **Mock These**: DB clients, `next/headers`, external APIs in price-analytics.

## Documentation Touchpoints

- Update inline JSDoc in tested files with `@example` test snippets.
- Add `TESTING.md` if missing: Testing setup, coverage goals.
- Reference in `AGENTS.md`: Test Writer workflows.
- PR descriptions: Link to new test files.

## Collaboration Checklist

1. [ ] Confirm feature specs/requirements with Engineer agent.
2. [ ] Analyze code changes (use `git diff` or PR context).
3. [ ] Run existing tests; check coverage gaps.
4. [ ] Write/review tests; commit as `test: add coverage for X`.
5. [ ] Generate coverage report; flag <80% areas.
6. [ ] Review PR with Engineer; suggest fixes.
7. [ ] Update docs (e.g., new mock patterns).
8. [ ] Capture learnings in agent log (e.g., common mocks).

## Hand-off Notes

- **Outcomes**: New `*.test.ts` files with >90% coverage on targets; updated coverage reports.
- **Risks**: Unmocked external deps (flag DB/auth issues); flaky tests (use `vi.useFakeTimers`).
- **Follow-ups**:
  - Engineer: Review/merge tests.
  - Deploy agent: Run E2E if coverage passes.
  - Monitor CI failures post-merge.
