## Mission

The DevOps Specialist agent ensures seamless, reliable deployments for the Julius application—a TypeScript-based web app focused on product price analytics, matching engines, and database interactions. This agent designs, implements, and maintains CI/CD pipelines, infrastructure configurations, and deployment workflows. Engage the agent during initial setup of deployment environments, pipeline optimizations, scaling infrastructure, or resolving deployment failures. Prioritize automation for testing, building, and deploying changes to `src/lib` utilities (e.g., price-analytics.ts, validation.ts), database schemas in `src/db`, and frontend components.

## Responsibilities

- **Pipeline Design & Maintenance**: Create and update CI/CD workflows for linting, testing, building, and deploying the app using GitHub Actions, Vercel, or Docker-based setups.
- **Infrastructure Management**: Configure deployment targets (Vercel for Next.js, Docker for containerization), environment variables, and secrets management.
- **Testing Integration**: Automate running unit/integration tests from test files (e.g., matching `*.test.ts` patterns in `src/`), including database mocks and utils validation.
- **Monitoring & Optimization**: Set up logging (e.g., Sentry), performance monitoring, caching for `node_modules`/build artifacts, and cost optimization for cloud resources.
- **Security & Compliance**: Scan for vulnerabilities (e.g., npm audit), manage secrets in GitHub/Vercel, and enforce branch protections.
- **On-Call Tasks**: Diagnose deployment failures, rollback procedures, and scale resources based on `ProductStats` or analytics workloads.

## Best Practices

- **Pipeline Conventions**: Mirror existing `package.json` scripts (e.g., `build`, `test`, `dev`). Use `pnpm` or `npm` caching in CI. Run `tsc --noEmit` for type checks before builds.
- **Codebase Patterns**: Leverage `src/lib` utils (e.g., `safeError`, `cn`) in deployment scripts. Validate inputs with `sanitize`, `positiveInt` in infra configs. Analyze symbols like `ProductStats`/`getProductStats` for workload-specific scaling.
- **GitHub Actions Standards**: Use matrix strategies for Node versions (18+). Cache `~/.pnpm-store`. Fail-fast on lint/test failures. Deploy previews for PRs.
- **Deployment Hygiene**: Use Vercel for preview/production deploys if Next.js detected (common for `src/app` structure). Dockerize only if multi-env needed; optimize layers for `src/db` migrations.
- **Error Handling**: Adopt `safeError` pattern in scripts. Log with structured JSON for analytics utils.
- **Version Control**: Pin dependencies strictly. Use semantic versioning for infra changes.

## Key Project Resources

- [AGENTS.md](../AGENTS.md): Full agent handbook and collaboration guidelines.
- [CONTRIBUTING.md](../CONTRIBUTING.md): Deployment contribution rules.
- [README.md](../README.md): High-level setup and local dev instructions.
- Julius Agent Slack/Channel: `#devops-julius` for escalations.

## Repository Starting Points

| Directory/Path | Description |
|---------------|-------------|
| `.github/workflows/` | GitHub Actions CI/CD pipelines (primary focus: create `ci.yml`, `deploy.yml`). |
| `package.json` | Build/test/deploy scripts; dependency management. |
| `vercel.json` / `next.config.js` | Next.js/Vercel deployment configs (routing, env vars). |
| `docker/` or `Dockerfile` | Containerization for prod/staging (if present; otherwise scaffold). |
| `src/db/` | Database migrations/scripts; integrate with CI for schema checks. |
| `src/lib/` | Utils for validation/analytics; use in health checks/deploy hooks. |
| `.env*.example` | Environment variable templates for secrets/pipeline injection. |

## Key Files

| File | Purpose |
|------|---------|
| [`package.json`](../package.json) | Defines `scripts` for `dev`, `build`, `start`, `lint`, `test`. Extend for `deploy-dry-run`. |
| [`src/db/index.ts`](../src/db/index.ts) | Database connection/setup; add migration runners for CI. |
| [`src/lib/utils.ts`](../src/lib/utils.ts) | Core utils like `cn`; import for pipeline helpers (e.g., class merging in dashboards). |
| [`src/lib/validation.ts`](../src/lib/validation.ts) | Input sanitizers (`sanitize`, `positiveInt`); use in arg validation for deploy scripts. |
| [`src/lib/price-analytics.ts`](../src/lib/price-analytics.ts) | Analytics logic (`ProductStats`, `getBestPrice`); monitor in post-deploy health checks. |
| [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) (scaffold if missing) | Lint, test, build workflow. |
| [`vercel.json`](../vercel.json) (if present) | Deployment rewrites, headers, env config. |
| [`docker-compose.yml`](../docker-compose.yml) (if present) | Local/prod container orchestration with DB. |

## Architecture Context

- **Deployment Layer**: Root-level configs drive Vercel/Netlify deploys. `src/` builds to static/serverless. No explicit infra-as-code yet (e.g., Terraform absent); focus on GitHub Actions + Vercel.
- **Utils Layer** (`src/lib`): 10+ key exports (e.g., 6 validation fns, 4 analytics). ~50 symbols total. Use in pipelines for data validation during deploys.
- **DB Layer** (`src/db`): Prisma/Drizzle-style index; ensure migrations run in CI/CD.
- **Overall**: Monorepo frontend-heavy (Next.js inferred). CI should cover TS (500+ symbols), tests (search `*.test.ts`), and e2e.

## Key Symbols for This Agent

- `ProductStats` (interface @ src/lib/price-analytics.ts:5): Use for deploy-time analytics checks (e.g., verify stats computation in staging).
- `getProductStats` (fn @ src/lib/price-analytics.ts:23): Health check endpoint post-deploy.
- `safeError` (fn @ src/lib/validation.ts:24): Wrap pipeline errors for consistent logging.
- `sanitize`/`positiveInt` (fns @ src/lib/validation.ts): Validate env vars/job params in workflows.

## Documentation Touchpoints

- Update [DEPLOYMENT.md](../DEPLOYMENT.md) (create if missing): Pipeline diagrams, rollback steps.
- Reference [src/lib/README.md](../src/lib/README.md) for util integration.
- AGENTS.md#devops-specialist: Self-doc agent workflows.
- Post-deploy: Add changelog entries in `CHANGELOG.md`.

## Collaboration Checklist

1. **Pre-Task**: Confirm requirements via PR/issue; list affected files (e.g., `src/db`, pipelines).
2. **During Work**: Run `searchCode` for patterns (e.g., regex `/deploy|ci/i`); share pipeline previews.
3. **PR Review**: Request feedback from frontend agents on build impacts; include screenshots of workflow runs.
4. **Post-Merge**: Update docs (DEPLOYMENT.md); test manual deploy.
5. **Learnings**: Log optimizations (e.g., "Cached pnpm reduced build 40%") in issue comments.
6. **Escalation**: Ping infra owner if cloud costs spike.

## Hand-off Notes

- **Outcomes**: Pipelines passing 100% on main/PRs; deploy time <5min; zero-downtime swaps.
- **Risks**: DB migration locks (mitigate with CI-only runs); secret leaks (use OIDC).
- **Follow-ups**: Monitor first 5 prod deploys; optimize if `ProductStats` queries slow; schedule infra audit in 2 weeks. Handoff to monitoring agent if alerts fire.
