# Authentication & Identity Service

![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Database-4169E1?logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-Cache-DC382D?logo=redis&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT-black?logo=jsonwebtokens)
![OAuth2](https://img.shields.io/badge/OAuth-2.0-4285F4?logo=google&logoColor=white)
![Status](https://img.shields.io/badge/status-in%20development-yellow)

A scalable, security-focused authentication backend built with **Node.js, Express.js, PostgreSQL, Redis, JWT, and OAuth 2.0**.

This project is designed as a complete authentication and identity platform rather than only a login API. The goal is to progressively support multiple authentication methods, secure session management, account recovery, OAuth providers, rate limiting, two-factor authentication, device/session management, and account-security workflows.

---

## Table of Contents

- [Project Vision](#project-vision)
- [Core Capabilities](#core-capabilities)
- [Authentication Architecture](#authentication-architecture)
- [Authentication Flows](#authentication-flows)
- [JWT Authentication](#jwt-authentication)
- [Refresh Token & Session Architecture](#refresh-token--session-architecture)
- [Google OAuth 2.0](#google-oauth-20)
- [Google Account Linking](#google-account-linking)
- [Password Management](#password-management)
- [Logout & Session Management](#logout--session-management)
- [Email Management](#email-management)
- [Custom Registration Flows](#custom-registration-flows)
- [Two-Factor Authentication](#two-factor-authentication)
- [Redis](#redis)
- [Rate Limiting](#rate-limiting)
- [Validation](#validation)
- [Security Model](#security-model)
- [API Route Map](#api-route-map)
- [Database Design](#database-design)
- [Project Structure](#project-structure)
- [Environment Configuration](#environment-configuration)
- [Request Logging](#request-logging)
- [Error Handling](#error-handling)
- [Development Roadmap](#development-roadmap)
- [Testing Strategy](#testing-strategy)
- [Production Checklist](#production-checklist)
- [Future Extensions](#future-extensions)
- [Design Principles](#design-principles)
- [License](#license)
- [Author](#author)

---

## Project Vision

The project is intended to evolve into a **complete authentication service** that handles the full lifecycle of a user identity:

```
                    Authentication Service
                            |
        +-------------------+-------------------+
        |                   |                   |
        v                   v                   v
 Email/Password         OAuth 2.0             2FA
        |                   |                   |
        +-------------------+-------------------+
                            |
                            v
                    Identity / User
                            |
                            v
                    Session Management
                            |
        +-------------------+-------------------+
        |                   |                   |
        v                   v                   v
     JWTs                 Redis              PostgreSQL
        |                   |                   |
        v                   v                   v
 Protected APIs       Temporary State       Persistent State
```

The system provides a consistent application-level authentication model regardless of how the user authenticates:

```
Password Login
      \
       \
Google Login ---> Local User ---> Application Session
       /
      /
Future OAuth Provider
```

The external identity provider authenticates the user, but **the application owns the final application session**.

---

## Core Capabilities

**Account creation**
- Email/password registration
- Email verification with token expiration
- Resend verification email
- Google-based registration/login
- Future custom registration flows
- Future invitation-based registration

**Authentication**
- Email/password login
- Google OAuth 2.0
- JWT access tokens
- Refresh tokens with rotation
- Session validation
- Future 2FA

**Account security**
- Password reset / forgot password / change password
- Email change
- Two-factor authentication
- Session revocation (current device, all devices, specific device)

**Identity management**
- Google account linking
- Multiple authentication methods per account
- Device/session tracking
- Active-session management

**Infrastructure**
- Redis, PostgreSQL
- Rate limiting
- Request logging
- Validation
- Centralized error handling

---

## Authentication Architecture

```
                         Client
                           |
                           v
                     Express Router
                           |
             +-------------+-------------+
             |             |             |
             v             v             v
        Rate Limiter   Validator    Authentication
             |             |             |
             +-------------+-------------+
                           |
                           v
                       Controller
                           |
                           v
                        Service
                           |
          +----------------+----------------+
          |                |                |
          v                v                v
       Repository         Redis         External APIs
          |                |                |
          v                v                v
      PostgreSQL         Cache          Google/Email
```

### Separation of concerns

| Layer | Responsibility |
|---|---|
| **Routes** | HTTP method, endpoint, middleware, controller wiring |
| **Middleware** | Authentication, rate limiting, validation, future authorization |
| **Controllers** | Read `req`, call services, map results to HTTP responses |
| **Services** | Business logic, auth decisions, token/session/OAuth/password workflows — never touch `req`/`res` |
| **Repositories** | PostgreSQL queries, user/session persistence, account relationships |
| **Redis service** | Centralized abstraction over `GET`/`SET`/`SETEX`/`INCR`/`EXPIRE`/`DEL` and future atomic Lua operations |

---

## Authentication Flows

### Registration

```
POST /register → Rate Limit → Validate input → Check email → Hash password
→ Generate verification token → Create user → Send verification email
```

The account is created but remains unverified until the email verification process succeeds.

### Email Verification

```
GET /verify?token=<token> → Find token → Check existence → Check expiration → Mark user verified
```

Verification tokens are random, short-lived, single-use, and stored securely.

### Login

```
POST /login → Rate limit → Validate credentials → Find user → Check email verification
→ Verify password → Create application session → Access Token + Refresh Token + Session Record
```

---

## JWT Authentication

Two primary token types: **Access Token** and **Refresh Token**.

### Access token

Short-lived, used for protected APIs.

```json
{
  "sub": "14",
  "jti": "uuid",
  "type": "access",
  "iat": 1786303009,
  "exp": 1786303909,
  "aud": "application",
  "iss": "authentication-service"
}
```

The authentication middleware validates signature, algorithm, expiration, issuer, audience, token type, and required claims. After verification:

```js
req.user = decoded;
```

The user ID is always taken from `req.user.sub` — never from a client-provided request body.

---

## Refresh Token & Session Architecture

Refresh tokens are tied to PostgreSQL sessions:

```
Refresh JWT → contains → session_id → PostgreSQL session
```

A session record contains:

```
session_id, user_id, refresh_token_hash, device_id, device_name,
ip_address, user_agent, last_active, revoked_at, expires_at,
created_at, updated_at
```

This gives the system both **stateless access authentication** and **stateful refresh/session control**.

### Refresh Token Rotation

```
POST /refreshToken → Verify refresh JWT → Hash incoming token → Find session
→ Verify session ID → Generate new refresh token → Hash it → Replace stored hash
→ Generate new access token → Return credentials
```

The old refresh token is no longer valid for that session — this also lays the foundation for detecting refresh-token reuse.

---

## Google OAuth 2.0

Uses the OAuth 2.0 Authorization Code flow. There are intentionally **two separate flows** — Google Login and Google Account Linking — with separate callback endpoints and redirect URIs.

### Google Login

```
GET /google → Generate random state → Store state in Redis → Redirect to Google
→ User authenticates → Google callback → Validate state → Exchange code
→ Get Google profile → Find user by google_id
    ├── Existing user → Create application session
    └── New Google identity → Check email
            ├── Exists → Ask user to link
            └── New → Create user
```

The Google access token is **not** the application's access token:

```
Google authenticates user → Application identifies user → Application creates its own access + refresh tokens
```

---

## Google Account Linking

Only available to an authenticated local user.

```
GET /google/link → JWT Auth → req.user.sub → Generate OAuth state
→ Redis: google:link:state:<state> -> userId → Redirect to Google
→ Google callback → Read userId from Redis → Consume state → Exchange code
→ Get Google identity → Check google_id ownership
→ UPDATE users SET google_id = ... WHERE id = ...
```

The callback never trusts a `userId` sent by the browser — the identity is bound to the OAuth state server-side.

---

## Password Management

Planned to support **Forgot Password**, **Password Reset**, and **Change Password**.

**Forgot password**
```
POST /forgot-password → Find account → Generate short-lived reset token
→ Store token securely → Send reset email
```

**Password reset**
```
POST /password-reset → Validate reset token → Check expiration
→ Hash new password → Update password → Invalidate appropriate sessions
```

**Change password**
```
Authenticated user → POST /change-password → Verify current password
→ Hash new password → Update password
```

Password changes are treated as security-sensitive events.

---

## Logout & Session Management

Planned routes:

```
POST /logout
POST /logout/allDevices
POST /logout/specificDevice
GET  /all-sessions
```

- **Current-device logout** — identify session from the current access token, revoke it.
- **Logout from all devices** — revoke every session belonging to the user.
- **Logout from specific device** — revoke one selected session.

This is one of the major reasons refresh tokens are stored server-side.

---

## Email Management

Planned functionality: change email, email verification, email re-verification.

```
Authenticated User → Request email change → Verify identity
→ Send verification to new email → Verify token → Update email
```

Email changes are protected against account takeover.

---

## Custom Registration Flows

The architecture reserves support for custom account creation, e.g. `POST /invite-register`, covering invitations, organization membership, referral registration, partner onboarding, admin-created accounts, and pre-approved users. These flows still converge on the same underlying user/session architecture.

---

## Two-Factor Authentication

Planned as a separate authentication layer:

```
POST   /two-fa/setup
POST   /two-fa/enable
POST   /two-fa/verify
POST   /two-fa/resend
DELETE /two-fa/disable
```

```
Password / Google Authentication → Is 2FA enabled?
    ├── No  → Session
    └── Yes → OTP/2FA → Session
```

The final implementation can support TOTP and/or OTP depending on the selected design.

---

## Redis

Used for temporary, high-frequency, and coordination-related data.

**OAuth state**
```
google:login:state:<state>
google:link:state:<state>
```

**Rate-limit counters**
```
login:<client>
registration:<client>
refreshToken:<client>
```

**Temporary verification/reset state (future)**
```
password-reset:<token>
two-fa:<challenge>
email-change:<token>
```

Redis data should have explicit TTLs wherever possible.

---

## Rate Limiting

Authentication endpoints are rate-limited to reduce brute-force attacks, credential stuffing, verification-email abuse, OAuth abuse, refresh-token abuse, and automated registration.

```js
loginRateLimit: rateLimitMiddleware({
  key: "login",
  maxRequests: 5,
  expirySeconds: 60,
});
```

| Route | Maximum | Window |
|---|---|---|
| Registration | 5 | 60 sec |
| Login | 5 | 60 sec |
| Resend verification | 3 | 60 sec |
| Refresh token | 2 | 60 sec |

The rate limiter uses Redis counters. For high-concurrency production workloads, increment and expiration should be made atomic with a Lua script or an equivalent Redis transaction strategy.

---

## Validation

Input validation is applied at the route layer to keep malformed input away from the service layer:

```js
router
  .route("/register")
  .post(
    ratelimiter.registrationRateLimit,
    validate(registrationSchema),
    authController.registration,
  );
```

Validation covers email format, password requirements, required fields, string lengths, device information, refresh-token structure, and future OTP/reset-token formats.

---

## Security Model

The system follows a defense-in-depth approach.

**Password security** — Passwords exist in memory as plaintext only during the authentication operation, are never logged or persisted directly, and are hashed with a strong algorithm such as bcrypt/Argon2.

**Token security** — Never log access tokens, refresh tokens, OAuth authorization codes, Google access tokens, passwords, or client secrets. Refresh tokens are stored as hashes.

**OAuth security** — State is cryptographically random, short-lived, single-use, and stored server-side. The callback rejects missing, expired, or reused state.

**JWT security** — Verification validates signature, algorithm, issuer, audience, expiration, and token type.

**Account-linking security** — Never accept an arbitrary user ID from query parameters, request body, or client-side state. Use the authenticated user's identity, bound to the OAuth state in Redis.

---

## API Route Map

| Group | Routes |
|---|---|
| Registration & Verification | `POST /register`, `GET /verify`, `POST /resend-verification` |
| Login | `POST /login` |
| JWT | `POST /refreshToken` |
| Google | `GET /google`, `GET /google/callback`, `GET /google/link`, `GET /google/link/callback` |
| Password | `POST /password-reset`, `POST /forgot-password`, `POST /change-password` |
| Logout / Sessions | `POST /logout`, `POST /logout/allDevices`, `POST /logout/specificDevice`, `GET /all-sessions` |
| Email | `POST /change-email` |
| Custom registration | `POST /invite-register` |
| Two-factor authentication | `POST /two-fa/setup`, `POST /two-fa/enable`, `POST /two-fa/verify`, `POST /two-fa/resend`, `DELETE /two-fa/disable` |

The exact HTTP methods and payloads can evolve as the API contracts are finalized.

---

## Database Design

### Users

```
id
name
email
password
google_id
is_verified
verification_token
verification_token_expires
created_at
updated_at
```

Recommended constraints: `email UNIQUE`, `google_id UNIQUE` (depending on the account model).

### Sessions

```
session_id
user_id
refresh_token_hash
device_id
device_name
ip_address
user_agent
last_active
revoked_at
expires_at
created_at
updated_at
```

**Relationship:** `users 1:N sessions` — one user can have a laptop session, mobile session, tablet session, and others simultaneously.

---

## Project Structure

```
src/
│
├── config/
│   ├── database.js
│   ├── google.js
│   ├── jwt.js
│   ├── logger.js
│   └── redis.js
│
├── constants/
│   └── defaults.js
│
├── controller/
│   └── authController.js
│
├── middlewares/
│   ├── auth.middleware.js
│   ├── rateLimit.middleware.js
│   └── validator.js
│
├── repos/
│   └── user/
│       ├── user.js
│       └── session.js
│
├── routes/
│   └── auth/
│       └── auth.routes.js
│
├── services/
│   ├── auth.service.js
│   ├── email.service.js
│   ├── google.service.js
│   ├── redis.service.js
│   └── token.service.js
│
├── utils/
│   ├── password.js
│   ├── response.js
│   ├── token.js
│   └── rateLimiter.js
│
├── validators/
│   └── auth.validator.js
│
└── server.js
```

As the project grows, large modules can be split into dedicated domains: `auth/`, `password/`, `oauth/`, `session/`, `twofa/`, `email/`.

---

## Environment Configuration

```env
PORT=8000

# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=auth_service
DB_USER=postgres
DB_PASSWORD=

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ALGORITHM=
JWT_ISSUER=
JWT_AUDIENCE=
JWT_ACCESS_EXPIRES_IN=
JWT_REFRESH_EXPIRES_IN=

# Google OAuth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=
GOOGLE_LINK_REDIRECT_URI=

# Email
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
```

> Secrets must not be committed to source control.

---

## Request Logging

The project uses Pino/Pino HTTP for request logging. The target format is intentionally compact:

```
INFO: request completed {
  "reqId": 1,
  "url": "/v1/auth/login",
  "responseTime": 158
}
```

Sensitive fields are always redacted: `authorization`, `password`, `refreshToken`, `accessToken`, `cookies`, OAuth codes.

---

## Error Handling

Follows a controller/service separation.

**Service layer**
```js
try {
  // business logic
} catch (error) {
  logger.error({ error }, "Authentication service error");
  throw error;
}
```

**Controller layer**
```js
try {
  const result = await service.operation();
  return responseHelper.customResponse(
    res,
    defaults.OK_CODE,
    defaults.SUCCESS_MESSAGE,
    result,
  );
} catch (error) {
  logger.error({ error }, "Authentication controller error");
  return responseHelper.customResponse(
    res,
    defaults.INTERNAL_SERVER_ERROR_CODE,
    defaults.SERVER_ERROR_MESSAGE,
    { error: defaults.SERVER_ERROR_MESSAGE },
  );
}
```

Services never call HTTP response helpers directly.

---

## Development Roadmap

**Phase 1 — Core authentication** ✅
- [x] PostgreSQL setup
- [x] User repository
- [x] Registration
- [x] Password hashing
- [x] Email verification
- [x] Resend verification
- [x] Password login
- [x] Access JWT
- [x] Refresh JWT
- [x] PostgreSQL sessions

**Phase 2 — Security infrastructure** ✅
- [x] Redis integration
- [x] Redis service abstraction
- [x] OAuth state storage
- [x] Rate limiting
- [x] Request logging
- [x] Request validation
- [x] Refresh-token rotation

**Phase 3 — OAuth** ✅
- [x] Google OAuth login flow
- [x] Google callback
- [x] Google user lookup
- [x] Google account creation
- [x] Google account linking
- [x] Separate Google link callback
- [x] Redis-backed link state

**Phase 4 — Password security**
- [ ] Forgot password
- [ ] Password reset
- [ ] Change password
- [ ] Reset-token expiration
- [ ] Session invalidation after sensitive password changes

**Phase 5 — Session management**
- [ ] Logout
- [ ] Logout all devices
- [ ] Logout specific device
- [ ] List active sessions
- [ ] Session revocation
- [ ] Session activity updates
- [ ] Refresh-token reuse detection

**Phase 6 — Email identity**
- [ ] Change email
- [ ] Verify new email
- [ ] Re-verification workflow
- [ ] Email security notifications

**Phase 7 — Two-factor authentication**
- [ ] 2FA setup
- [ ] 2FA enable
- [ ] 2FA verification
- [ ] 2FA resend
- [ ] 2FA disable
- [ ] Recovery codes
- [ ] TOTP support

**Phase 8 — Advanced security**
- [ ] Suspicious-login detection
- [ ] Device trust
- [ ] Account lockout strategy
- [ ] Security event logging
- [ ] Refresh-token reuse detection
- [ ] Session anomaly detection
- [ ] Security notifications

---

## Testing Strategy

**Unit tests** — password helpers, token helpers, JWT verification, Redis helpers, rate limiter, validation schemas.

**Service tests** — registration, login, verification, refresh-token rotation, Google login, Google linking, password reset, session management.

**Integration tests** — full stack from router → middleware → controller → service → repository → PostgreSQL/Redis. Key scenarios:

```
Expired verification token       Invalid OAuth state
Expired refresh token            Expired OAuth state
Invalid refresh token            Reused OAuth state
Refresh token reuse              Google account already linked
Email already registered         Invalid password
Unverified account                Rate limit exceeded
Revoked session
```

**End-to-end flows**

```
Register → Verify → Login → Access protected API → Refresh → Logout

Google login → Google callback → Local session → Refresh

Local login → Google link → Google callback → Google linked → Google login
```

---

## Production Checklist

- [ ] HTTPS everywhere
- [ ] Strong JWT secrets
- [ ] Secure environment configuration
- [ ] Password hashing
- [ ] Refresh-token hashing
- [ ] Refresh-token rotation
- [ ] OAuth state validation, expiration & one-time consumption
- [ ] Unique email constraint
- [ ] Unique Google ID constraint
- [ ] Authentication rate limiting
- [ ] Atomic Redis rate limiter
- [ ] Secure cookies where used (`HttpOnly`, `Secure`, appropriate `SameSite`)
- [ ] CORS restrictions
- [ ] JWT issuer / audience / algorithm validation
- [ ] Token-type validation
- [ ] No token/password logging
- [ ] Google client secrets protected
- [ ] Redis authentication/TLS where required
- [ ] PostgreSQL connection pooling
- [ ] Database indexes
- [ ] Centralized error handling
- [ ] Monitoring & metrics
- [ ] Automated tests
- [ ] Backup/recovery strategy

---

## Future Extensions

The architecture can later support additional identity providers — Google, Apple, GitHub, Microsoft, Facebook, and other OIDC providers — all converging on the same local identity model:

```
External Provider → Provider Identity → Local User → Application Session
                                                            ├── Access JWT
                                                            ├── Refresh JWT
                                                            └── PostgreSQL Session
```

This keeps provider-specific logic isolated from the rest of the authentication system.

---

## Design Principles

1. **One application identity model** — regardless of authentication method (password, Google, future OAuth provider, 2FA), the application ultimately operates on a local user.
2. **Stateless access + stateful refresh** — access JWTs are short-lived, stateless, and used for API authorization; refresh JWTs are longer-lived, session-bound, stored as a hash, and rotated.
3. **Redis for temporary state** — OAuth state, rate-limit counters, temporary challenges, reset flows, 2FA challenges.
4. **PostgreSQL for durable identity state** — users, sessions, authentication relationships, account/verification/security state.
5. **Controllers stay thin** — read request → call service → return response. Business rules belong in services.
6. **Security-sensitive operations are explicit** — password change, email change, Google linking, logout-all-devices, and 2FA changes have explicit auth/security checks rather than being treated as ordinary CRUD.

---

## License

Add the project's chosen license here.

---

## Author

**Aryan Singh**

A backend authentication platform focused on secure identity management, JWT sessions, OAuth 2.0, Redis-based security infrastructure, and PostgreSQL-backed session management.