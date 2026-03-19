# Security Audit — Julius Smart Grocery App

**Date:** 2026-03-19
**Auditor:** Eve (OpenClaw Agent)

---

## 1. Pre-Audit Findings

### CRITICAL: No Authentication
- **All API routes** were completely open — no auth middleware, no session checks, no auth library
- **All page routes** were publicly accessible
- Anyone with the URL could read/write all data

### Input Validation
- No input validation on POST endpoints
- No type checking on request bodies
- No sanitization of string inputs

### Security Headers
- No security headers configured
- No HSTS, X-Frame-Options, or CSP headers

### Error Handling
- Error responses were safe (generic messages only, no stack trace leaks) — **OK**

### SQL Injection
- **Low risk** — Drizzle ORM uses parameterized queries by default
- No raw SQL except one `sql` template literal in dashboard (safe — uses tagged template)

### CORS
- Next.js App Router does not enable CORS by default — **OK** (same-origin only)

---

## 2. Changes Implemented

### 2.1 Authentication (better-auth)
| File | Purpose |
|------|---------|
| `src/lib/auth.ts` | Better Auth server config with Drizzle adapter (PostgreSQL) |
| `src/lib/auth-client.ts` | Client-side auth hooks (signIn, signUp, signOut, useSession) |
| `src/app/api/auth/[...all]/route.ts` | Auth API catch-all route handler |
| `src/db/auth-schema.ts` | Auth tables: user, session, account, verification |
| `src/db/index.ts` | Updated to include auth schema |
| `drizzle.config.ts` | Updated to include auth schema file |

**Auth features:**
- Email/password registration and login
- Minimum 8-character passwords
- 7-day session expiry with daily refresh
- Cookie-based session with 5-minute cache
- Secure session token storage

### 2.2 Route Protection (middleware.ts)
| Route Pattern | Protection |
|---------------|------------|
| `/api/auth/*` | Public (auth endpoints) |
| `/login` | Public (login page) |
| `/api/*` | 401 JSON if no valid session |
| `/*` (pages) | Redirect to `/login` if no session cookie |

**Middleware behavior:**
- Checks `better-auth.session_token` cookie
- For API routes: validates session via `/api/auth/get-session`, returns 401 JSON
- For pages: redirects to `/login?callbackUrl=<original-path>`
- Adds security headers to ALL responses

### 2.3 Security Headers
Added via both middleware and `next.config.ts`:

| Header | Value |
|--------|-------|
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `X-XSS-Protection` | `1; mode=block` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |

### 2.4 Input Validation
Created `src/lib/validation.ts` with:
- `sanitize()` — trims strings, removes null bytes
- `positiveNumber()` — validates numeric input
- `positiveInt()` — validates positive integer input

**Routes updated:**
- `POST /api/receipts` — validates total, date (YYYY-MM-DD format), marketId/Name, item prices
- `POST /api/prices` — validates price, source enum, product/market IDs, max 100 items per batch
- `POST /api/shopping-list` — validates productId/Name, quantity
- `PATCH /api/shopping-list` — validates id (positive int) and checked (boolean)
- `DELETE /api/shopping-list` — validates id (positive int)

### 2.5 Auth UI
| File | Purpose |
|------|---------|
| `src/app/login/page.tsx` | Login/register page with toggle |
| `src/app/login/layout.tsx` | Suspense wrapper (for useSearchParams) |
| `src/components/sidebar.tsx` | Added logout button |

---

## 3. Database Changes
Auth tables pushed to PostgreSQL (Neon):
- `user` — id, name, email, email_verified, image, timestamps
- `session` — id, token, expires_at, ip_address, user_agent, user_id
- `account` — id, provider_id, account_id, user_id, tokens, password hash
- `verification` — id, identifier, value, expires_at

---

## 4. Environment Variables
Required in `.env`:
```
BETTER_AUTH_SECRET=<random-secret-key>
BETTER_AUTH_URL=<app-url>
NEXT_PUBLIC_APP_URL=<app-url>
```

**Recommendation:** Replace the default `BETTER_AUTH_SECRET` with a cryptographically random string in production:
```bash
openssl rand -base64 32
```

---

## 5. Remaining Recommendations

| Priority | Item | Status |
|----------|------|--------|
| HIGH | Replace default BETTER_AUTH_SECRET in production | Manual |
| MEDIUM | Add rate limiting to auth endpoints (login/register) | Future |
| MEDIUM | Add CSRF protection for state-changing operations | Future |
| LOW | Add Content-Security-Policy header | Future |
| LOW | Implement email verification flow | Future |
| LOW | Add audit logging for sensitive operations | Future |

---

## 6. Files Changed

```
src/lib/auth.ts                          (new)
src/lib/auth-client.ts                   (new)
src/lib/validation.ts                    (new)
src/db/auth-schema.ts                    (new)
src/db/index.ts                          (modified)
src/app/api/auth/[...all]/route.ts       (new)
src/app/api/receipts/route.ts            (modified)
src/app/api/prices/route.ts              (modified)
src/app/api/shopping-list/route.ts       (modified)
src/app/login/page.tsx                   (new)
src/app/login/layout.tsx                 (new)
src/components/sidebar.tsx               (modified)
src/middleware.ts                        (new)
next.config.ts                           (modified)
drizzle.config.ts                        (modified)
SECURITY_AUDIT.md                        (new)
```
