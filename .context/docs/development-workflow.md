## Development Workflow

The development workflow for Julius emphasizes rapid iteration, collaboration, and reliability in a Next.js-based full-stack application. Follow these steps for day-to-day engineering:

1. **Start your session**: Always begin from the `main` branch. Pull the latest changes with `git pull origin main` to stay synchronized.
2. **Create a feature branch**: Use descriptive names like `feat/shopping-list-filter` or `fix/price-analytics-bug`. Branch off `main` for all changes.
3. **Make changes**: Implement features or fixes in the relevant areas—API routes in `src/app/api/*`, utils in `src/lib/*`, UI components in `src/components/*`, or pages in `src/app/*`.
4. **Run locally**: Validate your work (see [Local Development](#local-development)).
5. **Test thoroughly**: Write or update unit/integration tests. Run `npm test` and ensure coverage remains high. See [testing-strategy.md](./testing-strategy.md) for details.
6. **Lint and format**: Run `npm run lint` and `npm run format` to enforce code style.
7. **Commit atomically**: Use conventional commits (e.g., `feat: add price history endpoint`, `fix: resolve matching edge case`).
8. **Push and open PR**: Push your branch and create a Pull Request (PR) against `main`. Include a clear description, screenshots for UI changes, and links to related issues.
9. **Iterate on feedback**: Address review comments promptly.
10. **Merge and clean up**: Once approved, merge via squash or rebase. Delete the branch post-merge.

This process supports continuous deployment via CI/CD pipelines, ensuring every merge to `main` triggers automated builds, tests, and deployments.

## Branching & Releases

- **Branching model**: Trunk-based development. All work happens in short-lived feature/bugfix branches off `main`. Hotfixes use `hotfix/*` prefixes and merge directly to `main`. No long-lived `develop` or release branches.
- **Protected branches**: `main` requires:
  - Passing CI checks (lint, test, build).
  - At least 1 approving review.
  - Linear history (rebase before merge).
  - No force-pushes.
- **Release cadence**: Continuous releases on every merge to `main`. Automated deployments to staging for testing, production after manual approval.
- **Tagging conventions**: Semantic versioning (`vMAJOR.MINOR.PATCH`). Create tags like `v1.2.0` on `main` post-merge. Use annotations for changelogs: `git tag -a v1.2.0 -m "Release 1.2.0"`.
- **Emergency releases**: Cherry-pick hotfixes to `main` and tag immediately (e.g., `v1.2.1-hotfix`).

## Local Development

Set up your environment quickly with these commands. Assumes Node.js >=18 and pnpm (or npm/yarn).

```
- Clone and install: `git clone <repo> && pnpm install` (or `npm install`)
- Set up database: Copy `.env.example` to `.env.local`, update `DATABASE_URL`, then `pnpm db:push` (migrates schema) and `pnpm db:seed` (populates test data)
- Run dev server: `pnpm dev` (starts at http://localhost:3000)
- Run tests: `pnpm test`
- Lint: `pnpm lint`
- Format: `pnpm format`
- Build for production: `pnpm build`
- Preview production build: `pnpm start`
- Type check: `pnpm type-check`
```

**Notes**:
- Database uses Drizzle ORM (see `src/db/*`). Local Postgres recommended via Docker: `docker-compose up db`.
- For MCP endpoint testing (`/api/mcp`), ensure API keys are set in `.env.local`.
- UI uses Tailwind and shadcn/ui (see [tooling.md](./tooling.md) for setup).

## Code Review Expectations

Code reviews ensure high-quality, maintainable code. Every PR requires:

- **Checklists**:
  - Does it compile? (`pnpm build`)
  - Tests pass and cover new code? (100% for critical paths like `matchProductToNeeds` in `src/lib/match-engine.ts`)
  - No new lint errors.
  - Docs updated? (e.g., API changes in routes like `/api/prices`)
  - Security: Sanitize inputs (`sanitize` from `src/lib/validation.ts`), validate numbers (`positiveInt`/`positiveNumber`).
  - Performance: Efficient queries (e.g., analytics in `src/lib/price-analytics.ts`).
  - Accessibility/UI: Test responsive design, ARIA labels in components like `SpendingChart`.

- **Approvals**: At least 1 reviewer (2 for core lib changes like `match-engine.ts`). Self-reviews not allowed.
- **Agent collaboration**: Use AI agents for initial drafts or refactoring, but always review manually. See AGENTS.md for tips on prompting for Julius-specific patterns (e.g., "Refactor using `getBestPrice` utility").

Aim for <48h turnaround. Re-request reviews after addressing feedback.

## Onboarding Tasks

New contributors:

1. **Must-do**:
   - Complete setup and run `pnpm dev`.
   - Seed DB and explore endpoints (e.g., `GET /api/products`, `POST /api/needs`).
   - Fix a simple issue: [Good first issue label](https://github.com/<org>/julius/labels/good%20first%20issue).

2. **Starter tickets**:
   - Add tests for `isGoodDeal` in `src/lib/price-analytics.ts`.
   - UI polish: Enhance `src/app/lista/page.tsx` filters.
   - Docs: Expand [testing-strategy.md](./testing-strategy.md).

3. **Resources**:
   - Internal runbooks: [Dashboard](https://julius-internal.notion.site/Runbooks).
   - Slack channel: #dev-julius.

## Related Resources

- [testing-strategy.md](./testing-strategy.md)
- [tooling.md](./tooling.md)
