## Security & Compliance Notes

This project implements essential security guardrails to protect user data, prevent common web vulnerabilities, and ensure reliable operation. Key practices include:

- **Security Headers**: All responses are protected by custom middleware (`src/middleware.ts`) that adds headers such as `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, and `Strict-Transport-Security` via the `addSecurityHeaders` function. This mitigates risks like XSS, clickjacking, and MIME-type sniffing.
  
- **Input Validation and Sanitization**: All API inputs are validated using utilities from `src/lib/validation.ts` (`sanitize`, `positiveNumber`, `positiveInt`, `safeError`). These functions strip malicious content, enforce type constraints, and handle errors safely to prevent injection attacks and invalid data propagation.

- **Rate Limiting and Abuse Prevention**: API routes (e.g., `src/app/api/prices/route.ts`, `src/app/api/needs/route.ts`) implicitly benefit from Next.js middleware protections, with explicit checks in high-traffic endpoints like MCP (`src/app/api/mcp/route.ts`).

- **Data Access Controls**: Database operations via `src/db/index.ts` (`getDb`) are scoped to authenticated sessions, with no direct client-side DB access.

Developers must adhere to these practices: always validate inputs in new routes, avoid logging sensitive data, and test for OWASP Top 10 vulnerabilities. See [architecture.md](./architecture.md) for overall system architecture.

## Authentication & Authorization

Authentication is handled via NextAuth.js configured at `src/app/api/auth/[...all]/route.ts`, supporting standard providers (e.g., credentials, OAuth). Key details:

- **Identity Providers**: Primarily credentials-based login (email/password), with potential for Google/OAuth expansion. Sessions are managed server-side.

- **Token Formats and Sessions**: JWT or database sessions (configurable via NextAuth options). Cookies are secure (HttpOnly, Secure, SameSite=Strict) by default.

- **Session Strategies**: Server-side session verification in middleware (`src/middleware.ts`). Protected routes (e.g., `/api/shopping-list`, `/api/dashboard`) check `getServerSession` or `auth()` before processing.

- **Role/Permission Models**: Simple role-based access (e.g., user/admin inferred from session claims). All API routes enforce authentication except public endpoints like product listings. No granular RBAC; permissions are route-level (e.g., DELETE requires ownership checks in `src/app/api/needs/route.ts`).

Example usage in a protected route:

```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...all]/route';

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  // Proceed with authorized logic
}
```

Logout and session invalidation are handled via NextAuth callbacks. For custom guards, extend middleware.

## Secrets & Sensitive Data

Sensitive data is managed conservatively, with no production secrets in code:

- **Storage Locations**: Environment variables in `.env.local` (e.g., `DATABASE_URL`, `NEXTAUTH_SECRET`, API keys for external services). Loaded via Next.js `process.env`. No external vaults (e.g., AWS SSM, HashiCorp Vault) currently; recommend integration for scale.

- **Rotation Cadence**: Rotate `NEXTAUTH_SECRET` and DB credentials quarterly or on incident. Use tools like `dotenv-vault` for managed rotation.

- **Encryption Practices**: 
  - At-rest: PostgreSQL (via `src/db/index.ts`) uses server-side encryption if configured.
  - In-transit: HTTPS enforced via security headers.
  - Client-side: No localStorage for tokens; secure cookies only.
  
- **Data Classifications**:
  | Classification | Examples | Handling |
  |----------------|----------|----------|
  | Public | Product names, prices | No auth required |
  | Private | User needs, receipts | Session-bound, sanitized |
  | Sensitive | Passwords (hashed), API keys | Never logged/exposed; hashed via NextAuth |

Never commit `.env*` files (gitignored). Audit env usage with `grep -r 'process.env' src/`.

## Compliance & Policies

- **GDPR**: User data (needs, receipts) supports deletion requests via API DELETE endpoints (e.g., `/api/needs`). Consent via login.
- **SOC2**: Input validation and audit logs (via DB) align with controls; full audit trail pending.
- **Internal Policies**: No third-party analytics without review; all deps scanned via `npm audit`.

Evidence: Session logs, API access metrics from dashboard (`/api/dashboard`).

## Related Resources

- [architecture.md](./architecture.md)
