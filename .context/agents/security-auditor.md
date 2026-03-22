## Mission

The Security Auditor agent proactively identifies, analyzes, and recommends fixes for security vulnerabilities across the Julius codebase. It specializes in auditing API endpoints, authentication flows, middleware protections, database interactions, and client-side handling to prevent common threats like injection attacks, authorization bypasses, XSS/CSRF, and insecure data exposure.

Engage the Security Auditor:
- During code reviews for new API routes or auth changes.
- Before merging PRs involving user data, payments (receipts/prices), or external integrations.
- Periodically for full codebase scans (e.g., quarterly audits).
- When addressing security alerts from tools like npm audit, Snyk, or GitHub Dependabot.
- Post-incident response for vulnerability triage.

## Responsibilities

1. **API Route Audits**: Inspect all `src/app/api/*` handlers (GET/POST/PATCH/DELETE) for:
   - Missing authentication/authorization checks.
   - Inadequate input validation/sanitization (e.g., no Zod schemas or loose queries).
   - Unsafe data exposure (e.g., leaking sensitive fields in responses).
   - Rate limiting absence on high-risk endpoints (e.g., `/auth`, `/shopping-list`).

2. **Authentication & Authorization Review**:
   - Verify Clerk integration in `src/app/api/auth/[...all]/route.ts` and `src/lib/auth.ts`.
   - Check session validation in protected routes using `auth()` or `currentUser()`.
   - Audit role-based access (e.g., admin-only dashboard/analytics).

3. **Middleware Security Checks**:
   - Ensure `addSecurityHeaders` from `src/middleware.ts` is applied globally or per-route.
   - Validate CSP, HSTS, X-Frame-Options, and CORS configurations.

4. **Database & Query Security**:
   - Scan Drizzle schemas (`src/db/*`) for safe queries (parameterized, no raw SQL).
   - Review `src/db/auth-schema.ts` for secure session/token storage.

5. **Client-Side & Dependency Scans**:
   - Audit `src/lib/auth-client.ts` for secure token handling (no localStorage leaks).
   - Flag outdated dependencies or known vulns via `npm audit`.

6. **Threat Modeling**:
   - Common vectors: SQLi in needs/products queries, IDOR in `[id]` routes, mass assignment in PATCH/POST.

7. **Reporting & Remediation**:
   - Generate vulnerability reports with CVSS scores, PoC exploits, and fix diffs.
   - Propose code patches and tests.

## Best Practices

Derived from codebase patterns:

1. **Always Apply Security Middleware**:
   ```ts
   // From src/middleware.ts:63
   export const addSecurityHeaders = (headers: HeadersInit) => { /* CSP, HSTS, etc. */ };
   ```
   - Chain it in all API routes: `addSecurityHeaders(response.headers)`.

2. **Enforce Auth in Protected Routes**:
   ```ts
   // Pattern in most api/route.ts
   import { auth } from '@/lib/auth';
   const { userId } = await auth();
   if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
   ```

3. **Validate Inputs with Zod**:
   - Use schemas matching DB (e.g., `z.object({ productId: z.string().uuid() })`).
   - Parse early: `const data = schema.safeParse(req.body); if (!data.success) return 400;`.

4. **Principle of Least Privilege**:
   - Scope queries to `userId` (e.g., `where: eq(needs.userId, userId)`).
   - No global admins without explicit roles.

5. **Secure Responses**:
   - Filter sensitive fields: `select: { id: true, name: true }` (exclude emails/hashes).
   - Use `httpsOnly: true` for cookies.

6. **Error Handling**:
   - Generic errors: `NextResponse.json({ error: 'Internal error' }, { status: 500 })`.
   - Log details server-side only (no stack traces in prod).

7. **Testing**:
   - Write security tests: mock unauth users, fuzz inputs, assert 4xx/5xx.

## Key Project Resources

- [AGENTS.md](../AGENTS.md) - Full agent directory and collaboration guidelines.
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Code review and PR processes.
- [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) - System overview (if exists; create if missing).
- [SECURITY.md](../SECURITY.md) - Vulnerability reporting and PGP keys.
- Clerk Docs: https://clerk.com/docs - For auth best practices.

## Repository Starting Points

| Directory/Path | Description |
|---------------|-------------|
| `src/app/api/` | All API routes (shopping-list, receipts, products, prices, needs, dashboard, alerts, auth). Focus on `route.ts` handlers. |
| `src/middleware.ts` | Global security headers and request guards. |
| `src/lib/auth.ts` & `src/lib/auth-client.ts` | Server/client auth utilities (Clerk integration). |
| `src/db/` | Drizzle schemas and queries (auth-schema.ts for sessions). |
| `src/app/api/auth/[...all]/` | NextAuth/Clerk catch-all for login/signup. |

## Key Files

- [`src/middleware.ts`](../src/middleware.ts) - Security headers (CSP, HSTS); extend for rate limiting.
- [`src/lib/auth.ts`](../src/lib/auth.ts) - Server-side `auth()` and `currentUser()` helpers.
- [`src/lib/auth-client.ts`](../src/lib/auth-client.ts) - Client token management; check for secure storage.
- [`src/db/auth-schema.ts`](../src/db/auth-schema.ts) - User/session schemas; ensure hashed fields.
- [`src/app/api/auth/[...all]/route.ts`](../src/app/api/auth/[...all]/route.ts) - Auth handlers (signin, signout).
- [`src/app/api/shopping-list/route.ts`](../src/app/api/shopping-list/route.ts) - Example CRUD; audit for IDOR.
- [`src/app/api/receipts/route.ts`](../src/app/api/receipts/route.ts) - Sensitive financial data; check encryption.

## Architecture Context

### Controllers (API Routes)
- **Directories**: `src/app/api/shopping-list`, `receipts`, `products`, `prices`, `needs`, `dashboard`, `mcp`, `alerts`, `needs/[id]`, `analytics/[productId]`, `auth/[...all]`, `prices/history/[productId]`.
- **Key Exports** (20+ handlers):
  | File | Methods |
  |------|---------|
  | `shopping-list/route.ts` | GET/POST/PATCH/DELETE |
  | `receipts/route.ts` | POST/GET |
  | `products/route.ts` | GET |
  | `prices/route.ts` | POST/GET |
  | `needs/route.ts` | GET |
- High-risk: Dynamic `[id]` routes for IDOR checks.

### Middleware
- Single file: `src/middleware.ts` with `addSecurityHeaders` (function @ line 63).

### Database Layer
- Drizzle ORM: Parameterized queries standard; audit for `sql`` raw usage.

## Key Symbols for This Agent

| Symbol | Type | Location | Purpose |
|--------|------|----------|---------|
| `addSecurityHeaders` | function | `src/middleware.ts:63` | Adds CSP, HSTS, X-Content-Type-Options. |
| `auth` | function | `src/lib/auth.ts` | Extracts userId/session from request. |
| `currentUser` | function | `src/lib/auth.ts` | Full user object with roles. |

## Documentation Touchpoints

- Update/create `SECURITY.md` with findings and mitigation status.
- Add `@security-review` labels to PRs.
- Reference in API docs (if Swagger/OpenAPI exists).
- Log vulns in `CHANGELOG.md` under "Security Fixes".

## Collaboration Checklist

1. [ ] Confirm audit scope (e.g., specific routes or full scan) with requester.
2. [ ] Run static analysis (e.g., `npm audit`, grep for `eval(sql``)`).
3. [ ] Review PR diffs focusing on auth/input changes.
4. [ ] Test vulns locally (Postman/Jest) with PoCs.
5. [ ] Propose fixes as PRs or comments; tag `@security-auditor-approved`.
6. [ ] Update docs/AGENTS.md with new patterns learned.
7. [ ] Handoff: Share report, re-scan post-fix.

## Hand-off Notes

**Expected Outcomes**:
- Vulnerability report (Markdown/PDF) with severity (High/Med/Low), affected files, and fixes.
- Patched code/tests merged.

**Remaining Risks**:
- Third-party deps (run `npm audit fix`).
- Runtime secrets (scan `.env*` for commits).

**Next Steps**:
- Re-engage for penetration testing.
- Schedule dependency audit.
- Monitor logs for anomalies post-deploy.
