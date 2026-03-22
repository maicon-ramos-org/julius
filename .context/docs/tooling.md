## Tooling & Productivity Guide

This guide covers the essential tools, scripts, and workflows to set up a productive development environment for the Julius project. Julius is built as a pnpm monorepo/workspace, leveraging Next.js for the full-stack application, TypeScript for type safety, and a suite of utilities for price analytics, product matching, and dashboard features. 

Key productivity boosters include workspace-aware package management with pnpm, automated linting and formatting via pre-commit hooks, and optimized scripts for development, seeding, and database interactions. Follow these instructions to get up and running quickly, ensuring consistent code quality across contributions.

For a step-by-step onboarding flow, see [development-workflow.md](./development-workflow.md).

## Required Tooling

Install these tools to build, test, and run the project. Versions are pinned in `package.json` and `pnpm-workspace.yaml`.

- **Node.js** (v20.9+ LTS recommended)
  - Powers the Next.js runtime, TypeScript compilation, and build tools.
  - Install via [nvm](https://github.com/nvm-sh/nvm): `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash`, then `nvm install 20 && nvm use 20`.
  - Verify: `node --version`.

- **pnpm** (v9+)
  - Monorepo package manager for efficient dependency resolution across workspace packages (e.g., app, libs).
  - Install: `npm install -g pnpm`.
  - Verify: `pnpm --version`. Use `pnpm install` at repo root to bootstrap.
  - Workspace config: Defined in `pnpm-workspace.yaml` for shared deps like `@julius/lib`.

- **PostgreSQL** (v15+)
  - Database for needs, prices, receipts, products, and analytics.
  - Local setup: Use Docker (`docker run --name julius-db -e POSTGRES_PASSWORD=dev -p 5432:5432 -d postgres:15`) or [Postgres.app](https://postgresapp.com).
  - Connection: Managed via `src/db/index.ts` with `getDb()`. Update `DATABASE_URL` in `.env`.

- **Git** (v2.30+)
  - Version control with hooks for code quality.
  - Install via [Homebrew](https://brew.sh/) (macOS): `brew install git`.

## Recommended Automation

Streamline your workflow with built-in scripts and hooks. Run commands from the repo root.

### Pre-commit Hooks
Uses [Husky](https://typicode.github.io/husky/) + [lint-staged](https://github.com/okonet/lint-staged) for zero-config enforcement:
```
pnpm install  # Installs husky hooks
git add .
git commit -m "feat: add tooling docs"
```
- Lints staged files: ESLint (TypeScript, Next.js rules) + Prettier.
- Types checked: `tsc --noEmit`.
- Configs: `.eslintrc.json`, `prettier.config.js`.

### Linting & Formatting
```
pnpm lint     # eslint . --fix
pnpm format   # prettier --write .
pnpm typecheck # tsc --noEmit
```
Watch mode: `pnpm lint:watch` (using `concurrently` + `nodemon`).

### Build & Dev Scripts
```
pnpm dev      # Next.js dev server (http://localhost:3000)
pnpm build    # Production build + typecheck
pnpm start    # Production server
pnpm db:seed  # Run src/db/seed.ts to populate test data
```
Database migrations (Drizzle): `pnpm db:push` (updates schema).

### Code Generators
- UI Components (shadcn/ui): `pnpm shadcn add button` (uses `src/components/ui`).
- API Routes: Scaffold new routes in `src/app/api/[feature]/route.ts` following patterns like `src/app/api/prices/route.ts` (HTTP methods: GET/POST).
- Utils: Add to `src/lib/` (e.g., validation like `positiveInt`, matching like `matchProductToNeeds`).

Shortcuts:
- `alias julius="pnpm --filter @julius/app dev"` (add to `~/.zshrc`).
- Hot reload enabled in dev; Tailwind JIT purging in build.

## IDE / Editor Setup

### VS Code (Recommended)
Install these extensions for IntelliSense, error catching, and snippets:

| Extension | Purpose | Marketplace ID |
|-----------|---------|----------------|
| Tailwind CSS IntelliSense | Autocomplete for `cn()` utility in `src/lib/utils.ts` | `bradlc.vscode-tailwindcss` |
| TypeScript Importer | Quick imports for symbols like `ProductStats`, `matchAndPersist` | `pmneo.tsimporter` |
| ESLint | Real-time linting matching pre-commit | `dbaeumer.vscode-eslint` |
| Prettier | Auto-format on save | `esbenp.prettier-vscode` |
| shadcn/ui Tools | Snippets for `Sheet`, `Input`, etc. in `src/components/ui` | Search "shadcn" |
| Drizzle Kit | Schema visualization for `src/db/schema.ts` | `wsl.vscode-drizzle-kit` |

**.vscode/settings.json** snippet:
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

## Productivity Tips

- **Terminal Aliases** (add to `~/.zshrc` or `~/.bashrc`):
  ```
  alias julius-dev="pnpm dev"
  alias julius-db="pnpm db:seed && pnpm dev"
  alias julius-lint="pnpm lint && pnpm typecheck"
  ```

- **Local Dev Loop**:
  1. `pnpm install && pnpm db:push && pnpm db:seed`
  2. `pnpm dev` (app + API routes hot-reload)
  3. Test APIs: `curl http://localhost:3000/api/dashboard`
  4. Seed data exercises `getProductStats`, `isGoodDeal`, `matchAndPersist`.

- **Debugging**:
  - Middleware logging: Check `src/middleware.ts` for security headers.
  - DB Queries: Use `console.log` in `getDb()` wrappers or Drizzle Studio (`pnpm drizzle-studio`).

- **Monorepo Navigation**:
  - `pnpm why <pkg>` for dep trees.
  - VS Code workspace: Open repo root; multi-root for apps/libs.

Share your dotfiles or custom scripts in PRs for community tips!

## Related Resources

- [development-workflow.md](./development-workflow.md)
