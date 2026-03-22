```yaml
---
type: agent
name: Refactoring Specialist
description: Identify code smells and improvement opportunities
agentType: refactoring-specialist
phases: [E]
generated: 2026-03-21
status: filled
scaffoldVersion: "2.0.0"
---
```

# Refactoring Specialist Playbook

## Mission

The Refactoring Specialist agent is engaged during the **Enhancement (E)** phase to maintain code quality, eliminate technical debt, and improve maintainability across the Julius codebase. Activate this agent when:
- Code reviews identify smells like duplication, long functions, or poor naming.
- Performance bottlenecks or scalability issues are detected in utils or analytics layers.
- New features introduce inconsistencies with existing patterns (e.g., validation, class merging).
- Periodic codebase health checks reveal opportunities in lib/utils or price analytics.

Focus on surgical refactors: preserve behavior, enhance readability/performance, and align with TypeScript/Next.js conventions.

## Responsibilities

- **Scan for Code Smells**: Detect duplication, large functions (>50 LOC), magic numbers, nested conditionals, and unused exports using `searchCode` or manual review.
- **Refactor Utils Layer**: Optimize `src/lib/*` (validation.ts, utils.ts, price-analytics.ts, match-engine.ts) for purity, type safety, and performance.
- **Improve Type Safety**: Strengthen interfaces like `ProductStats`; eliminate `any` types and implicit returns.
- **Enhance Test Coverage**: Add/refactor tests in `src/__tests__/` mirroring refactored code patterns.
- **Update Documentation**: Inline JSDoc for public exports; update README.md or AGENTS.md if conventions change.
- **Performance Refactors**: Memoize pure functions (e.g., `isGoodDeal`, `matchProductToNeeds`); reduce computation in `getProductStats`.

## Best Practices

Derived from codebase analysis:

### Code Conventions
- **Class Merging**: Use `cn` from `src/lib/utils.ts` for Tailwind conditional classes: `cn("base", condition && "variant")`.
- **Validation**: Leverage `sanitize`, `positiveNumber`, `positiveInt`, `safeError` for inputs; prefer composable validators.
- **Analytics**: Return `ProductStats` interfaces; use `isGoodDeal`/`getBestPrice` thresholds consistently (e.g., 20% below avg).
- **Purity & Immutability**: Functions like `getProductStats` should be pure; avoid side-effects.
- **TypeScript**: Export typed interfaces/functions; use `zod` or native validators; no `console.log` in prod code.
- **File Organization**: Keep `src/lib/` for shared utils (<200 LOC/file); barrel exports in `index.ts`.

### Refactoring Rules
- **Boy Scout Rule**: Leave code cleaner than found.
- **Atomic Commits**: One smell/refactor per PR.
- **Pre/Post Verification**: Run `npm test`, `npm run lint`, and manual diff to confirm behavior preservation.
| Smell | Pattern | Fix Example |
|-------|---------|-------------|
| Duplication | Repeated validation | Extract to `src/lib/validation.ts` |
| Long Function | `getProductStats` computations | Split into `calculateAvg`, `variance` helpers |
| Poor Naming | `safeError` | Rename to `createValidationError` if misleading |
| Magic Numbers | Price thresholds | Consts at module top: `const GOOD_DEAL_THRESHOLD = 0.8;` |

## Key Project Resources

- **Agent Handbook**: [AGENTS.md](AGENTS.md) – Workflow standards.
- **Contributor Guide**: [CONTRIBUTING.md](CONTRIBUTING.md) – PR templates, lint rules.
- **Documentation Index**: [docs/INDEX.md](docs/) – Architecture diagrams.
- **Testing Guide**: [TESTING.md](TESTING.md) – Jest/Vitest patterns.

## Repository Starting Points

```
julius/
├── src/
│   ├── app/          # Next.js pages/routes (refactor for RSC patterns)
│   ├── components/   # UI components (focus Tailwind + cn usage)
│   ├── lib/          # Utils core (primary refactor target)
│   │   ├── utils.ts
│   │   ├── validation.ts
│   │   ├── price-analytics.ts
│   │   └── match-engine.ts
│   └── __tests__/    # Unit/integration tests
├── tests/            # E2E (Playwright/Cypress)
├── package.json      # Deps: Next.js, Tailwind, Zod?
└── README.md         # High-level overview
```

- **Primary Focus**: `src/lib/` (80% of refactors) – Shared logic prone to debt.
- **Secondary**: `src/components/` & `src/app/` for consumer-side optimizations.

## Key Files

| File | Purpose | Refactor Opportunities |
|------|---------|------------------------|
| `src/lib/utils.ts` | Core helpers (e.g., `cn` for clsx/tailwind-merge) | Memoize if heavy; add types |
| `src/lib/validation.ts` | Input sanitizers (`sanitize`, `positiveInt`) | Unify error handling; Zod integration |
| `src/lib/price-analytics.ts` | Stats & deal detection (`ProductStats`, `getBestPrice`) | Extract pure funcs; cache results |
| `src/lib/match-engine.ts` | Product matching | Reduce complexity; type generics |
| `src/__tests__/lib/` | Mirrors lib tests | Add for new refactors; snapshot behavior |

## Architecture Context

### Utils Layer (`src/lib/`)
- **Directories**: `src/lib`
- **Symbol Count**: ~15 exports (validators: 4, analytics: 5, utils: 2, matching: 1+)
- **Key Exports**:
  | Symbol | File | Role |
  |--------|------|------|
  | `cn` | utils.ts | Tailwind class merger |
  | `ProductStats` | price-analytics.ts | Core price interface |
  | `getProductStats` | price-analytics.ts | Computes stats |
  | `isGoodDeal` | price-analytics.ts | Deal logic |
  | `sanitize`, `positiveNumber` | validation.ts | Input guards |

No deep domain layers detected; flat lib structure ideal for refactors.

## Key Symbols for This Agent

- `ProductStats` (interface) - `price-analytics.ts:5` – Centralize enhancements here.
- `cn` (function) – Ensure consistent UI refactors.
- `getProductStats` (function) – Prime for performance splits.
- All `src/lib/` exports – Prioritize typed, pure refactors.

## Documentation Touchpoints

- **Inline JSDoc**: Add `@param`, `@returns` to all public exports (e.g., `getBestPrice`).
- **AGENTS.md**: Update this playbook post-refactor.
- **ARCHITECTURE.md**: Note lib changes if thresholds updated.
- **CHANGELOG.md**: Log breaking refactors.

## Collaboration Checklist

1. **Confirm Scope**: Review ticket/PR; list 3-5 smells with `searchCode` evidence.
2. **Gather Context**: Use `analyzeSymbols` on target files; diff before/after.
3. **Refactor Iteratively**: One file/PR; run tests/lint.
4. **Peer Review**: Ping dev-lead; highlight behavior tests.
5. **Update Docs**: JSDoc + playbook if conventions shift.
6. **Capture Learnings**: Add to [LEARNINGS.md](LEARNINGS.md).

## Hand-off Notes

- **Outcomes**: PR link with 100% test pass, coverage +5%, LOC reduced 10-20%.
- **Risks**: Rare behavior changes in analytics – mitigated by snapshots.
- **Follow-ups**:
  - Monitor perf in prod (e.g., `getProductStats`).
  - Schedule lib audit quarterly.
  - If Zod added, migrate validators.
