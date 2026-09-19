# Consumer Authentication API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the approved GraphQL phone-signup, OTP, login, token refresh, logout, and `currentUser` flows on top of the separately prepared PostgreSQL/MikroORM foundation.

**Architecture:** `UsersModule` owns `User` persistence and the `currentUser` query. `AuthModule` owns OTP challenges, refresh sessions, access-token validation, and authentication mutations; it depends on `UsersModule` in one direction. Access tokens stay stateless for 15 minutes, while one server-side refresh session per user rotates under a PostgreSQL row lock and expires absolutely after 30 days.

**Tech Stack:** NestJS 11, GraphQL/Apollo, PostgreSQL, MikroORM, `@nestjs/jwt`, bcrypt, Node.js `crypto`, class-validator, Jest, Supertest

**Spec:** `docs/superpowers/specs/2026-09-19-consumer-auth-api-design.md`

## Global Constraints

- Complete the separate PostgreSQL/MikroORM foundation task before Task 1; this plan does not install or configure the ORM.
- The foundation must provide `MikroOrmModule.forRoot(...)`, request-scoped EntityManager support, migrations under `src/database/migrations/`, a disposable PostgreSQL test database, `test/jest-integration.json`, and a `test:integration` package script.
- Keep the public GraphQL names exactly as specified: `sendSignupOtp`, `verifySignupOtp`, `signUp`, `login`, `refreshSession`, `logout`, and `currentUser`.
- Use `phone`, never `phoneNumber`, for GraphQL and entity property names.
- Keep `PHONE_NUMBER_ALREADY_REGISTERED` as the duplicate-phone error code.
- Access tokens contain only `sub`, `iat`, and `exp`, expire after 15 minutes, and are never persisted.
- Refresh sessions expire 30 days after login and do not extend during rotation.
- Allow one refresh session per user; a new login replaces the previous session.
- Store bcrypt/HMAC/SHA-256 outputs in the fields named `password`, `otp`, `verificationToken`, and `refreshToken`; never store those secrets in plaintext.
- Use bcrypt cost 12 and reject passwords longer than 72 UTF-8 bytes.
- Keep OTP lifetime at 5 minutes, resend cooldown at 60 seconds, verification attempts at 5, phone send limit at 5 per hour, and verification-token lifetime at 10 minutes.
- Do not add repository interfaces, a generic identity provider layer, Redis, a token denylist, a clock abstraction, or a new logging package.
- Preserve metadata-only logging: phone, password, OTP, SMS body, verification token, access token, and refresh token must never appear in logs.

## Prerequisite Contract

The separate database task must make these commands succeed before this plan starts:

```bash
yarn mikro-orm debug
yarn mikro-orm migration:list
yarn test:integration --listTests
```

It must also expose a PostgreSQL `EntityManager` from `@mikro-orm/postgresql`, discover entities registered through `MikroOrmModule.forFeature(...)`, and provide a test database through `DATABASE_URL`. `test:integration` must execute Jest with `test/jest-integration.json`. If any check fails, stop and finish the database task rather than introducing mocks or an in-memory persistence fallback here.

## File Map

- Create `src/users/phone.ts`: normalize and validate Korean mobile numbers.
- Create `src/users/user.entity.ts`: MikroORM `User` entity and GraphQL `User` object.
- Create `src/users/users.service.ts`: user lookup and creation through an optional transactional EntityManager.
- Create `src/users/users.resolver.ts`: protected `currentUser` query.
- Create `src/users/users.module.ts`: user persistence boundary.
- Create `src/auth/auth.error.ts`: stable GraphQL error codes with safe HTTP status metadata.
- Create `src/auth/auth.crypto.ts`: auth-scoped HMAC, SHA-256, token generation, and constant-time comparison.
- Create `src/auth/auth.types.ts`: GraphQL inputs and payloads plus internal token result types.
- Create `src/auth/otpChallenge.entity.ts`: OTP challenge, verification, invalidation, and consumption state.
- Create `src/auth/otp.service.ts`: OTP send/verify/consume policy.
- Create `src/auth/refreshSession.entity.ts`: one refresh session per user.
- Create `src/auth/session.service.ts`: access issuance, refresh rotation, login replacement, and logout.
- Create `src/auth/auth.service.ts`: signup and login orchestration.
- Create `src/auth/public.decorator.ts`: metadata for public GraphQL operations.
- Create `src/auth/auth.guard.ts`: global Bearer access-token guard.
- Create `src/auth/auth.resolver.ts`: public authentication mutations.
- Create `src/auth/auth.module.ts`: auth providers, entities, JWT registration, and global guard.
- Modify `src/common/common.resolver.ts`: mark `healthCheck` public.
- Modify `src/graphqlException.filter.ts`: preserve coded GraphQL errors and map validation failures.
- Modify `src/app.module.ts`: register validation, `UsersModule`, and `AuthModule`.
- Create `src/database/migrations/Migration20260919000100.ts`: auth tables and constraints.
- Create focused unit tests under `test/users/` and `test/auth/`.
- Create `test/auth/auth.integration-spec.ts`: PostgreSQL constraints and concurrency.
- Create `test/auth/auth.e2e-spec.ts`: full GraphQL auth journey and log leakage regression.

## Review Focus

- Two simultaneous refreshes using the same token: exactly one succeeds and the other returns `UNAUTHENTICATED`; pinned in Task 4 and Task 8.
- Two near-simultaneous OTP sends for the same phone: the PostgreSQL advisory lock makes one create the challenge and the other return `TOO_MANY_REQUESTS`; pinned in Task 3 and Task 8.
- Passwords at the bcrypt byte boundary: 72 UTF-8 bytes are accepted and 73 bytes are rejected; pinned in Task 5.
- Reusing a consumed verification token or racing two signups: one user is created and the other attempt fails without a second session; pinned in Task 5 and Task 8.
- A replacement login invalidates the previous refresh token but not its already-issued access token before the 15-minute expiry; pinned in Task 8 so nobody accidentally adds a per-request session lookup.

---

### Task 0: Verify the Database Foundation

**Files:**
- Read: `package.json`
- Read: the MikroORM configuration and migration directory created by the database task

**Interfaces:**
- Consumes: configured PostgreSQL MikroORM connection, CLI, migration runner, and `DATABASE_URL` test database.
- Produces: evidence that Tasks 1-9 can use real PostgreSQL without adding persistence scaffolding.

- [ ] **Step 1: Verify installed integration packages**

Run:

```bash
yarn why @mikro-orm/core
yarn why @mikro-orm/nestjs
yarn why @mikro-orm/postgresql
yarn why @mikro-orm/migrations
```

Expected: each command reports one installed version and no missing package.

- [ ] **Step 2: Verify configuration and database connectivity**

Run:

```bash
yarn mikro-orm debug
yarn mikro-orm migration:list
```

Expected: entity discovery and PostgreSQL connection succeed; migration status is printed. If not, stop this plan and repair the separate database task.

---

### Task 1: Stable GraphQL Error and Validation Contract

**Files:**
- Create: `src/auth/auth.error.ts`
- Modify: `src/graphqlException.filter.ts`
- Modify: `src/app.module.ts`
- Create: `test/auth/auth.error.spec.ts`
- Create: `test/graphqlException.filter.spec.ts`
- Modify: `test/app.module.spec.ts`

**Interfaces:**
- Consumes: `GraphQLError`, Nest `HttpException`, and the existing global `GraphqlExceptionFilter`.
- Produces: `authError(code, message, status, extra?)`, stable `extensions.code`, preserved HTTP status for safe response logging, and a global validating pipe.

- [ ] **Step 1: Write failing tests for coded errors and filter behavior**

Create tests with these exact cases:

```ts
const error = authError(
  'PHONE_NUMBER_ALREADY_REGISTERED',
  'Phone is already registered',
  HttpStatus.CONFLICT,
);

expect(error.extensions.code).toBe('PHONE_NUMBER_ALREADY_REGISTERED');
expect(error.originalError).toBeInstanceOf(HttpException);
expect((error.originalError as HttpException).getStatus()).toBe(409);
```

For `GraphqlExceptionFilter`, pass a GraphQL `ArgumentsHost` stub and assert:

```ts
expect(filter.catch(error, graphqlHost)).toBe(error);

const mapped = filter.catch(
  new BadRequestException('invalid input'),
  graphqlHost,
) as GraphQLError;
expect(mapped.extensions.code).toBe('BAD_USER_INPUT');
expect(mapped.message).toBe('invalid input');

const unauthenticated = filter.catch(
  new UnauthorizedException('Authentication required'),
  graphqlHost,
) as GraphQLError;
expect(unauthenticated.extensions.code).toBe('UNAUTHENTICATED');
```

Update `test/app.module.spec.ts` to assert `APP_PIPE` is registered with `ValidationPipe` configured with `{ transform: true, whitelist: true }`.

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```bash
yarn test test/auth/auth.error.spec.ts test/graphqlException.filter.spec.ts test/app.module.spec.ts --runInBand
```

Expected: FAIL because `auth.error.ts` and the global validation provider do not exist and the filter does not preserve `GraphQLError`.

- [ ] **Step 3: Implement the error helper**

Create `src/auth/auth.error.ts`:

```ts
import { HttpException, HttpStatus } from '@nestjs/common';
import { GraphQLError } from 'graphql';

export type AuthErrorCode =
  | 'BAD_USER_INPUT'
  | 'PHONE_NUMBER_ALREADY_REGISTERED'
  | 'TOO_MANY_REQUESTS'
  | 'UNAUTHENTICATED';

export function authError(
  code: AuthErrorCode,
  message: string,
  status: HttpStatus,
  extra: Record<string, unknown> = {},
): GraphQLError {
  return new GraphQLError(message, {
    originalError: new HttpException(message, status),
    extensions: { code, ...extra },
  });
}
```

Modify `GraphqlExceptionFilter.catch()` so it:

1. Returns an incoming `GraphQLError` unchanged.
2. Wraps `BadRequestException` in a `GraphQLError` whose code is `BAD_USER_INPUT` and whose `originalError` is the original exception.
3. Wraps `UnauthorizedException` in a `GraphQLError` whose code is `UNAUTHENTICATED` and whose `originalError` is the original exception.
4. Preserves other known `HttpException` instances.
5. Continues replacing unknown errors with `InternalServerErrorException`.

Register this provider in `AppModule`:

```ts
{
  provide: APP_PIPE,
  useValue: new ValidationPipe({ transform: true, whitelist: true }),
}
```

- [ ] **Step 4: Run focused and existing exception tests**

Run:

```bash
yarn test test/auth/auth.error.spec.ts test/graphqlException.filter.spec.ts test/app.module.spec.ts test/app.e2e-spec.ts --runInBand
```

Expected: PASS; the existing known-error message remains visible and unknown sensitive errors remain hidden.

- [ ] **Step 5: Commit**

```bash
git add src/auth/auth.error.ts src/graphqlException.filter.ts src/app.module.ts test/auth/auth.error.spec.ts test/graphqlException.filter.spec.ts test/app.module.spec.ts
git commit -m "feat: define GraphQL auth errors"
```

---

### Task 2: User Persistence and Phone Normalization

**Files:**
- Create: `src/users/phone.ts`
- Create: `src/users/user.entity.ts`
- Create: `src/users/users.service.ts`
- Create: `src/users/users.module.ts`
- Create: `test/users/phone.spec.ts`
- Create: `test/users/users.service.spec.ts`

**Interfaces:**
- Consumes: the PostgreSQL `EntityManager` and MikroORM entity decorators provided by Task 0.
- Produces: `normalizePhone(phone: string): string`, `User`, and `UsersService.findByPhone`, `findById`, `existsByPhone`, and `create`.

- [ ] **Step 1: Write failing phone normalization tests**

Create `test/users/phone.spec.ts` with these assertions:

```ts
expect(normalizePhone('010-1234-5678')).toBe('01012345678');
expect(normalizePhone(' 010 1234 5678 ')).toBe('01012345678');
expect(() => normalizePhone('0111234567')).toThrow('Invalid phone');
expect(() => normalizePhone('010-1234-abcd')).toThrow('Invalid phone');
```

The implementation must remove only whitespace and hyphens; it must not silently strip arbitrary characters.

- [ ] **Step 2: Write failing user-service tests**

Use a mocked PostgreSQL `EntityManager` and verify these exact calls:

```ts
await service.findByPhone('01012345678');
expect(em.findOne).toHaveBeenCalledWith(User, { phone: '01012345678' });

service.create(
  { name: '홍길동', phone: '01012345678', password: 'bcrypt-value' },
  transactionEm,
);
expect(transactionEm.create).toHaveBeenCalledWith(User, {
  name: '홍길동',
  phone: '01012345678',
  password: 'bcrypt-value',
});
expect(transactionEm.persist).toHaveBeenCalledWith(expect.any(User));
```

- [ ] **Step 3: Run tests and verify RED**

Run:

```bash
yarn test test/users/phone.spec.ts test/users/users.service.spec.ts --runInBand
```

Expected: FAIL because the user files do not exist.

- [ ] **Step 4: Implement the user boundary**

Create `normalizePhone` with this contract:

```ts
export function normalizePhone(phone: string): string {
  const normalized = phone.replace(/[\s-]/g, '');
  if (!/^010\d{8}$/.test(normalized)) {
    throw new BadRequestException('Invalid phone');
  }
  return normalized;
}
```

Define `User` as both the MikroORM entity for table `users` and the GraphQL object. Use `randomUUID()` for a UUID primary key, `phone` as an 11-character unique property, and omit `@Field()` from `password`:

```ts
@Entity({ tableName: 'users' })
@ObjectType()
export class User {
  @PrimaryKey({ type: 'uuid' })
  @Field(() => ID)
  id = randomUUID();

  @Property({ length: 50 })
  @Field()
  name!: string;

  @Property({ length: 11, unique: true })
  @Field()
  phone!: string;

  @Property({ hidden: true })
  password!: string;

  @Property({ onCreate: () => new Date() })
  @Field(() => GraphQLISODateTime)
  createdAt = new Date();

  @Property({ onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt = new Date();
}
```

Implement `UsersService` with these signatures; all methods use the injected EntityManager unless a transaction manager is supplied:

```ts
findByPhone(phone: string, em?: EntityManager): Promise<User | null>;
findById(id: string, em?: EntityManager): Promise<User | null>;
existsByPhone(phone: string, em?: EntityManager): Promise<boolean>;
create(
  input: Pick<User, 'name' | 'phone' | 'password'>,
  em?: EntityManager,
): User;
```

`create()` must call `manager.create(User, input)`, immediately call `manager.persist(user)`, and return the managed entity without flushing; the caller owns the transaction boundary.

Register `User` with `MikroOrmModule.forFeature([User])`, provide `UsersService`, and export only `UsersService` from `UsersModule`.

- [ ] **Step 5: Run the focused tests and build**

Run:

```bash
yarn test test/users/phone.spec.ts test/users/users.service.spec.ts --runInBand
yarn build
```

Expected: PASS and successful TypeScript compilation.

- [ ] **Step 6: Commit**

```bash
git add src/users test/users
git commit -m "feat: add user persistence boundary"
```

---

### Task 3: OTP Challenge Lifecycle

**Files:**
- Create: `src/auth/auth.crypto.ts`
- Create: `src/auth/auth.types.ts`
- Create: `src/auth/otpChallenge.entity.ts`
- Create: `src/auth/otp.service.ts`
- Create: `test/auth/auth.crypto.spec.ts`
- Create: `test/auth/otp.service.spec.ts`

**Interfaces:**
- Consumes: `UsersService`, `SmsService`, `UtilService.getOtp()`, `ConfigService`, `EntityManager`, `normalizePhone`, and `authError`.
- Produces: `OtpService.sendSignupOtp`, `verifySignupOtp`, and `consumeVerificationToken`, plus GraphQL OTP payload types.

- [ ] **Step 1: Write failing crypto tests**

Pin these behaviors:

```ts
expect(sha256('secret')).toMatch(/^[a-f0-9]{64}$/);
expect(hmacSha256('123456', 'pepper')).toMatch(/^[a-f0-9]{64}$/);
expect(randomToken()).toMatch(/^[A-Za-z0-9_-]{43}$/);
expect(safeEqual(sha256('a'), sha256('a'))).toBe(true);
expect(safeEqual(sha256('a'), sha256('b'))).toBe(false);
```

Mock only `randomBytes`; use real `createHash`, `createHmac`, and `timingSafeEqual` behavior otherwise.

- [ ] **Step 2: Write failing OTP policy tests**

Use Jest fake timers and mocked dependencies to cover each named behavior:

- `sendSignupOtp` normalizes phone, rejects an existing user with `PHONE_NUMBER_ALREADY_REGISTERED`, acquires `pg_advisory_xact_lock(hashtext(?))`, invalidates active challenges, stores only the HMAC, sends the plaintext OTP once, and returns 5-minute `expiresAt` plus `retryAfterSeconds: 60`.
- a second send inside 60 seconds returns `TOO_MANY_REQUESTS` with `extensions.retryAfterSeconds`.
- a sixth send within one hour returns `TOO_MANY_REQUESTS`.
- concurrent sends are serialized by the advisory-lock SQL call.
- an SMS failure sets `invalidatedAt`, rethrows a safe service error, and leaves the send counted.
- `verifySignupOtp` rejects any code that is not exactly six ASCII digits with `BAD_USER_INPUT` before querying a challenge.
- `verifySignupOtp` increments `attemptCount` on mismatch, rejects the sixth attempt, rejects expired/invalidated challenges, and stores only the SHA-256 digest of a 10-minute verification token.
- `consumeVerificationToken` rejects values that are not 43-character base64url tokens with `BAD_USER_INPUT` before hashing or querying.
- `consumeVerificationToken` locks the challenge with `LockMode.PESSIMISTIC_WRITE`, rejects expired/consumed tokens, sets `consumedAt`, and returns the challenge phone.

Assert no mocked persistence call receives the plaintext OTP or verification token.

- [ ] **Step 3: Run tests and verify RED**

Run:

```bash
yarn test test/auth/auth.crypto.spec.ts test/auth/otp.service.spec.ts --runInBand
```

Expected: FAIL because the crypto, entity, types, and service files do not exist.

- [ ] **Step 4: Implement cryptographic helpers and GraphQL OTP payloads**

Create `auth.crypto.ts` using only `node:crypto`:

```ts
export const sha256 = (value: string): string =>
  createHash('sha256').update(value).digest('hex');

export const hmacSha256 = (value: string, secret: string): string =>
  createHmac('sha256', secret).update(value).digest('hex');

export const randomToken = (): string => randomBytes(32).toString('base64url');

export function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}
```

In `auth.types.ts`, define the approved payloads exactly:

```ts
@ObjectType()
export class OtpRequestPayload {
  @Field(() => GraphQLISODateTime)
  expiresAt!: Date;

  @Field(() => Int)
  retryAfterSeconds!: number;
}

@ObjectType()
export class OtpVerificationPayload {
  @Field()
  verificationToken!: string;

  @Field(() => GraphQLISODateTime)
  expiresAt!: Date;
}
```

- [ ] **Step 5: Implement the OTP entity and service**

Map `OtpChallenge` to `otp_challenge` with UUID `id`, 11-character `phone`, 64-character `otp`, `expiresAt`, `attemptCount`, nullable 64-character unique `verificationToken`, nullable verification/invalidation/consumption timestamps, and `createdAt`. Keep all fields internal; do not add GraphQL decorators.

Implement these exact service signatures:

```ts
sendSignupOtp(phone: string): Promise<OtpRequestPayload>;
verifySignupOtp(phone: string, code: string): Promise<OtpVerificationPayload>;
consumeVerificationToken(
  token: string,
  em: EntityManager,
): Promise<OtpChallenge>;
```

For `sendSignupOtp`, use a short transaction containing:

```ts
await em.getConnection().execute(
  'select pg_advisory_xact_lock(hashtext(?))',
  [normalizedPhone],
);
```

Then check the cooldown/hourly count, invalidate active rows, create and flush the new challenge, and commit before calling `SmsService.sendOtp`. On SMS failure, set `invalidatedAt`, flush it in a new request-context operation, and throw `new ServiceUnavailableException('SMS delivery failed')`; do not propagate the provider error message.

`verifySignupOtp` owns an `em.transactional()` boundary and locks the challenge with `LockMode.PESSIMISTIC_WRITE`. `consumeVerificationToken` uses the caller-provided EntityManager and the same lock without starting a nested transaction, because `AuthService.signUp` owns the encompassing transaction. Read `OTP_HMAC_SECRET` through `ConfigService.getOrThrow<string>()` in the `OtpService` constructor.

- [ ] **Step 6: Run focused tests and build**

Run:

```bash
yarn test test/auth/auth.crypto.spec.ts test/auth/otp.service.spec.ts --runInBand
yarn build
```

Expected: PASS; plaintext-secret assertions remain green.

- [ ] **Step 7: Commit**

```bash
git add src/auth/auth.crypto.ts src/auth/auth.types.ts src/auth/otpChallenge.entity.ts src/auth/otp.service.ts test/auth/auth.crypto.spec.ts test/auth/otp.service.spec.ts
git commit -m "feat: add signup OTP lifecycle"
```

---

### Task 4: Stateless Access Tokens and Rotating Refresh Sessions

**Files:**
- Create: `src/auth/refreshSession.entity.ts`
- Create: `src/auth/session.service.ts`
- Modify: `src/auth/auth.types.ts`
- Create: `test/auth/session.service.spec.ts`

**Interfaces:**
- Consumes: configured `JwtService`, PostgreSQL `EntityManager`, `User`, and auth crypto/error helpers.
- Produces: `SessionService.start`, `refresh`, `logout`, and `verifyAccessToken`; `SessionTokens` and complete `AuthPayload` types.

- [ ] **Step 1: Write failing token/session tests**

Use a fixed current time and assert:

- `start(user)` signs `{ sub: user.id }` with `expiresIn: '15m'`, stores only the refresh secret digest, returns a `sessionId.secret` refresh token, and sets an absolute 30-day expiry.
- a second `start(user)` acquires `pg_advisory_xact_lock(hashtext(?))`, deletes/replaces the previous session, and does not put `sessionId` into the access token payload.
- `refresh(token)` locks the row with `PESSIMISTIC_WRITE`, compares the SHA-256 digest, rotates the secret, preserves the original `expiresAt`, and returns the related user.
- two `refresh` calls using the same token result in one success and one `UNAUTHENTICATED` after the stored digest changes.
- malformed token, missing row, mismatched secret, and expired session all return `UNAUTHENTICATED` without logging the token.
- `logout` returns `true` for malformed, missing, expired, and already-deleted tokens; it deletes a row only when both session ID and secret match.
- `verifyAccessToken` accepts a payload containing only a string `sub` and rejects missing/non-string subjects.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
yarn test test/auth/session.service.spec.ts --runInBand
```

Expected: FAIL because the refresh entity and session service do not exist.

- [ ] **Step 3: Implement the refresh entity**

Map `RefreshSession` to `refresh_session`:

```ts
@Entity({ tableName: 'refresh_session' })
export class RefreshSession {
  @PrimaryKey({ type: 'uuid' })
  id = randomUUID();

  @OneToOne(() => User, {
    owner: true,
    unique: true,
    deleteRule: 'cascade',
    fieldName: 'user_id',
  })
  user!: Rel<User>;

  @Property()
  refreshToken!: string;

  @Property()
  expiresAt!: Date;

  @Property({ onCreate: () => new Date() })
  createdAt = new Date();

  @Property({ onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt = new Date();
}
```

Extend `auth.types.ts` with the internal and GraphQL response shapes:

```ts
export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
}

@ObjectType()
export class AuthPayload implements SessionTokens {
  @Field(() => User)
  user!: User;

  @Field()
  accessToken!: string;

  @Field()
  refreshToken!: string;

  @Field(() => GraphQLISODateTime)
  accessTokenExpiresAt!: Date;

  @Field(() => GraphQLISODateTime)
  refreshTokenExpiresAt!: Date;
}
```

- [ ] **Step 4: Implement session issuance and rotation**

Expose these methods:

```ts
start(user: User, em?: EntityManager): Promise<SessionTokens>;
refresh(rawToken: string): Promise<AuthPayload>;
logout(rawToken: string): Promise<boolean>;
verifyAccessToken(rawToken: string): Promise<{ sub: string }>;
```

Use constants in this file, not configurable abstractions:

```ts
const ACCESS_TOKEN_SECONDS = 15 * 60;
const REFRESH_TOKEN_SECONDS = 30 * 24 * 60 * 60;
```

Use the `JwtService` configured by `AuthModule` with `JWT_SECRET`. Generate access expiry dates from the same `now` used for signing. Parse refresh tokens by requiring exactly one period, a UUID session ID, and a 43-character base64url secret.

When `start` receives no EntityManager, it opens `this.em.transactional((em) => this.start(user, em))`. When it receives one, it performs the work directly in that existing transaction. Serialize a login replacement by user ID with PostgreSQL advisory locking, delete the prior row, insert the new row, and flush. For refresh, acquire a pessimistic write lock on the row before comparing and replacing `refreshToken`; this is the runnable proof that one of two concurrent refreshes fails.

- [ ] **Step 5: Run focused tests and build**

Run:

```bash
yarn test test/auth/session.service.spec.ts --runInBand
yarn build
```

Expected: PASS; access JWT assertions show no `sessionId` claim.

- [ ] **Step 6: Commit**

```bash
git add src/auth/refreshSession.entity.ts src/auth/session.service.ts src/auth/auth.types.ts test/auth/session.service.spec.ts
git commit -m "feat: add rotating refresh sessions"
```

---

### Task 5: Signup and Login Orchestration

**Files:**
- Create: `src/auth/auth.service.ts`
- Modify: `src/auth/auth.types.ts`
- Create: `test/auth/auth.service.spec.ts`

**Interfaces:**
- Consumes: `OtpService.consumeVerificationToken`, `UsersService`, `SessionService`, bcrypt, and PostgreSQL transactions.
- Produces: `AuthService.signUp(input): Promise<AuthPayload>` and `AuthService.login(input): Promise<AuthPayload>`.

- [ ] **Step 1: Write failing signup tests**

Cover these exact cases:

- trims a 1-50 character name, accepts an 8-character password, hashes it with bcrypt cost 12, consumes verification, creates the user, creates the session, and returns one `AuthPayload` in a single transaction.
- accepts exactly 72 UTF-8 bytes and rejects 73 UTF-8 bytes with `BAD_USER_INPUT`; include a multibyte Korean-string case so character length cannot accidentally replace byte length.
- rejects an empty trimmed name and a password shorter than 8 characters with `BAD_USER_INPUT`.
- maps an existing phone before creation and a PostgreSQL unique violation during the race to `PHONE_NUMBER_ALREADY_REGISTERED`.
- a consumed verification token cannot create a second user or refresh session.
- if session creation fails, the user and verification consumption roll back with the transaction.

- [ ] **Step 2: Write failing login tests**

Assert that:

- phone input is normalized before lookup.
- an unknown phone and a wrong password return the same `UNAUTHENTICATED` code and message.
- successful comparison replaces the refresh session and returns user plus tokens.
- no error or logger call contains the supplied password.

- [ ] **Step 3: Run the focused test and verify RED**

Run:

```bash
yarn test test/auth/auth.service.spec.ts --runInBand
```

Expected: FAIL because `AuthService` does not exist.

- [ ] **Step 4: Implement approved GraphQL inputs**

In `auth.types.ts`, define:

```ts
@InputType()
export class SignUpInput {
  @Field()
  @IsString()
  name!: string;

  @Field()
  @IsString()
  password!: string;

  @Field()
  @IsString()
  verificationToken!: string;
}

@InputType()
export class LoginInput {
  @Field()
  @IsString()
  phone!: string;

  @Field()
  @IsString()
  password!: string;
}
```

Keep semantic length validation in `AuthService` so signup and login produce the approved auth codes rather than class-validator-specific messages.

- [ ] **Step 5: Implement `AuthService`**

Use these signatures:

```ts
signUp(input: SignUpInput): Promise<AuthPayload>;
login(input: LoginInput): Promise<AuthPayload>;
```

For signup, run this complete sequence inside `em.transactional()`:

1. Validate and trim the name and validate password character/byte limits.
2. Call `otpService.consumeVerificationToken(input.verificationToken, em)`.
3. Recheck `usersService.existsByPhone(challenge.phone, em)`.
4. Hash with `bcrypt.hash(input.password, 12)`.
5. Create and persist `User` through `UsersService`.
6. Flush so database uniqueness is enforced.
7. Call `sessionService.start(user, em)` and return `AuthPayload`.

Catch only the PostgreSQL unique-constraint error for `users.phone` and map it to `PHONE_NUMBER_ALREADY_REGISTERED`; rethrow every unrelated database error.

For login, always execute one bcrypt comparison. When the phone is unknown, compare against this module-level cost-12 dummy hash so phone existence is not exposed through the response or a large timing difference:

```ts
const DUMMY_PASSWORD =
  '$2b$12$3mrlqUdi7niOK484fHY43.cInIgb0dVj6VVbSwGSJQXDe50/Cs8EC';
```

Return the same `UNAUTHENTICATED` error for unknown user and mismatch.

- [ ] **Step 6: Run focused tests and build**

Run:

```bash
yarn test test/auth/auth.service.spec.ts --runInBand
yarn build
```

Expected: PASS; cost 12 and 72-byte boundary assertions are green.

- [ ] **Step 7: Commit**

```bash
git add src/auth/auth.service.ts src/auth/auth.types.ts test/auth/auth.service.spec.ts
git commit -m "feat: add signup and login flows"
```

---

### Task 6: Global Access Guard and `currentUser`

**Files:**
- Create: `src/auth/public.decorator.ts`
- Create: `src/auth/auth.guard.ts`
- Create: `src/users/users.resolver.ts`
- Modify: `src/users/users.module.ts`
- Modify: `src/common/common.resolver.ts`
- Create: `test/auth/auth.guard.spec.ts`
- Create: `test/users/users.resolver.spec.ts`

**Interfaces:**
- Consumes: `SessionService.verifyAccessToken`, Nest `Reflector`, GraphQL request context, and `UsersService.findById`.
- Produces: global `AuthGuard`, `@Public()`, request `userId`, public health check, and protected `currentUser`.

- [ ] **Step 1: Write failing guard tests**

Build GraphQL `ExecutionContext` stubs and assert:

- `@Public()` handlers return `true` without reading the Authorization header.
- `Authorization: Bearer <token>` calls `verifyAccessToken` and writes only `userId` to the request.
- missing header, non-Bearer scheme, empty token, invalid JWT, expired JWT, and non-string `sub` each return `UNAUTHENTICATED`.
- the guard does not query `RefreshSession` or `UsersService`.

- [ ] **Step 2: Write failing `currentUser` tests**

Assert:

```ts
await resolver.currentUser({ userId: user.id } as Request & { userId: string });
expect(usersService.findById).toHaveBeenCalledWith(user.id);
```

When the user no longer exists, assert `UNAUTHENTICATED`; never return `null` from the non-null GraphQL query.

- [ ] **Step 3: Run tests and verify RED**

Run:

```bash
yarn test test/auth/auth.guard.spec.ts test/users/users.resolver.spec.ts --runInBand
```

Expected: FAIL because the decorator, guard, and resolver do not exist.

- [ ] **Step 4: Implement public metadata and guard**

Create:

```ts
export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
```

Define and export this request shape from `auth.guard.ts` for guard tests and future auth-owned consumers:

```ts
export type AuthenticatedRequest = Request & { userId: string };
```

`AuthGuard.canActivate()` must read public metadata with `Reflector.getAllAndOverride`, extract the GraphQL request with `GqlExecutionContext`, verify the Bearer token through `SessionService`, assign `request.userId = payload.sub`, and return `true`.

- [ ] **Step 5: Implement `currentUser` and keep health public**

Create `UsersResolver`:

```ts
@Resolver(() => User)
export class UsersResolver {
  constructor(private readonly usersService: UsersService) {}

  @Query(() => User)
  async currentUser(
    @Context('req') request: Request & { userId: string },
  ): Promise<User> {
    const user = await this.usersService.findById(request.userId);
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }
    return user;
  }
}
```

Register the resolver in `UsersModule`. Add `@Public()` to `CommonResolver.healthCheck()` so the global guard does not change the existing health contract.

- [ ] **Step 6: Run focused and common tests**

Run:

```bash
yarn test test/auth/auth.guard.spec.ts test/users/users.resolver.spec.ts test/app.e2e-spec.ts --runInBand
```

Expected: PASS; health check remains anonymous and public.

- [ ] **Step 7: Commit**

```bash
git add src/auth/public.decorator.ts src/auth/auth.guard.ts src/users/users.resolver.ts src/users/users.module.ts src/common/common.resolver.ts test/auth/auth.guard.spec.ts test/users/users.resolver.spec.ts
git commit -m "feat: protect GraphQL with access tokens"
```

---

### Task 7: Authentication GraphQL Module and Resolver

**Files:**
- Create: `src/auth/auth.resolver.ts`
- Create: `src/auth/auth.module.ts`
- Modify: `src/app.module.ts`
- Create: `test/auth/auth.resolver.spec.ts`
- Modify: `test/app.module.spec.ts`
- Generated: `schema.gql`

**Interfaces:**
- Consumes: `OtpService`, `AuthService`, `SessionService`, `UsersModule`, `CommonModule`, auth entities, and `@Public()`.
- Produces: the six public auth mutations, global guard registration, and final approved GraphQL schema.

- [ ] **Step 1: Write failing resolver contract tests**

Instantiate `AuthResolver` with mocked services and assert exact delegation and return values for:

```ts
sendSignupOtp(phone: string)
verifySignupOtp(phone: string, code: string)
signUp(input: SignUpInput)
login(input: LoginInput)
refreshSession(refreshToken: string)
logout(refreshToken: string)
```

Call `Reflect.getMetadata(IS_PUBLIC_KEY, AuthResolver.prototype.sendSignupOtp)`, then repeat the assertion for `verifySignupOtp`, `signUp`, `login`, `refreshSession`, and `logout`; every result must be `true`.

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
yarn test test/auth/auth.resolver.spec.ts test/app.module.spec.ts --runInBand
```

Expected: FAIL because the resolver/module do not exist and `AppModule` does not import them.

- [ ] **Step 3: Implement the resolver**

Each resolver method must be a one-line delegation with GraphQL decorators matching the spec. Do not parse, hash, query, or log inside the resolver. Use scalar `phone`, `code`, and `refreshToken` arguments and input objects only for `signUp` and `login`.

- [ ] **Step 4: Wire the auth module**

Create `AuthModule` with:

```ts
@Module({
  imports: [
    CommonModule,
    UsersModule,
    MikroOrmModule.forFeature([OtpChallenge, RefreshSession]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  providers: [
    AuthResolver,
    AuthService,
    OtpService,
    SessionService,
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AuthModule {}
```

Read `OTP_HMAC_SECRET` with `ConfigService.getOrThrow()` in the `OtpService` constructor. Because both providers are instantiated during module startup, a missing JWT or OTP secret must prevent the application from starting.

Import `UsersModule` and `AuthModule` into `AppModule`. Update `test/app.module.spec.ts` mocks so it verifies both modules are loaded without replacing the existing Config/GraphQL assertions.

- [ ] **Step 5: Generate and inspect the schema**

Run:

```bash
yarn build
```

In a terminal, run `yarn start`, wait for `Nest application successfully started`, then press Ctrl-C. Inspect the generated schema without editing:

```bash
rg -n "sendSignupOtp|verifySignupOtp|signUp|login|refreshSession|logout|currentUser|phoneNumber" schema.gql
```

Expected: all seven approved operations exist, fields use `phone`, and `phoneNumber` has no match.

- [ ] **Step 6: Run focused tests**

Run:

```bash
yarn test test/auth/auth.resolver.spec.ts test/app.module.spec.ts --runInBand
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/auth/auth.resolver.ts src/auth/auth.module.ts src/app.module.ts test/auth/auth.resolver.spec.ts test/app.module.spec.ts schema.gql
git commit -m "feat: expose GraphQL authentication API"
```

---

### Task 8: Auth Migration and PostgreSQL Integration Proof

**Files:**
- Create: `src/database/migrations/Migration20260919000100.ts`
- Create: `test/auth/auth.integration-spec.ts`

**Interfaces:**
- Consumes: all three entities and the real disposable PostgreSQL database from Task 0.
- Produces: durable tables/constraints and concurrency proof for signup, OTP send, login replacement, and refresh rotation.

- [ ] **Step 1: Write failing PostgreSQL integration tests**

Use a real MikroORM instance and reset only `refresh_session`, `otp_challenge`, and `users` between tests. Pin these behaviors:

1. Two users with the same `phone` violate `users_phone_unique`.
2. Two refresh sessions for one user violate `refresh_session_user_id_unique`.
3. Two concurrent refreshes with the same token yield one fulfilled result and one `UNAUTHENTICATED` rejection.
4. Two concurrent `sendSignupOtp` calls for the same phone yield one success and one `TOO_MANY_REQUESTS` rejection.
5. Two concurrent signups with one verification token create exactly one user and one refresh session.
6. A forced session-creation failure rolls back user creation and leaves the verification token unconsumed.
7. A new login makes the old refresh token fail while the old 15-minute access JWT still verifies until its expiry.

- [ ] **Step 2: Run the integration test and verify RED**

Run:

```bash
yarn test:integration test/auth/auth.integration-spec.ts --runInBand
```

Expected: FAIL because auth tables do not exist.

- [ ] **Step 3: Create the migration**

Create `Migration20260919000100` with explicit PostgreSQL SQL for:

```sql
create table "users" (
  "id" uuid primary key,
  "name" varchar(50) not null,
  "phone" varchar(11) not null,
  "password" text not null,
  "created_at" timestamptz not null,
  "updated_at" timestamptz not null,
  constraint "users_phone_unique" unique ("phone")
);

create table "otp_challenge" (
  "id" uuid primary key,
  "phone" varchar(11) not null,
  "otp" text not null,
  "expires_at" timestamptz not null,
  "attempt_count" integer not null default 0,
  "verified_at" timestamptz null,
  "verification_token" text null,
  "verification_expires_at" timestamptz null,
  "consumed_at" timestamptz null,
  "invalidated_at" timestamptz null,
  "created_at" timestamptz not null
);

create index "otp_challenge_phone_created_at_index"
  on "otp_challenge" ("phone", "created_at");
create unique index "otp_challenge_verification_token_unique"
  on "otp_challenge" ("verification_token")
  where "verification_token" is not null;

create table "refresh_session" (
  "id" uuid primary key,
  "user_id" uuid not null,
  "refresh_token" text not null,
  "expires_at" timestamptz not null,
  "created_at" timestamptz not null,
  "updated_at" timestamptz not null,
  constraint "refresh_session_user_id_unique" unique ("user_id"),
  constraint "refresh_session_user_id_foreign"
    foreign key ("user_id") references "users" ("id") on delete cascade
);
```

The `down()` method drops `refresh_session`, `otp_challenge`, and `users` in that order.

- [ ] **Step 4: Apply the migration and run integration tests**

Run:

```bash
yarn mikro-orm migration:up
```

Then run:

```bash
yarn test:integration test/auth/auth.integration-spec.ts --runInBand
```

Expected: all seven cases PASS. The concurrency tests must use separate `EntityManager.fork()` instances so the result is a database proof rather than a shared in-memory Unit of Work artifact.

- [ ] **Step 5: Commit**

```bash
git add src/database/migrations/Migration20260919000100.ts test/auth/auth.integration-spec.ts
git commit -m "feat: migrate authentication data"
```

---

### Task 9: Full GraphQL Authentication Journey and Leakage Regression

**Files:**
- Create: `test/auth/auth.e2e-spec.ts`

**Interfaces:**
- Consumes: the complete application, real test PostgreSQL, mocked `SmsService`, and HTTP GraphQL requests.
- Produces: end-to-end proof of the public schema, auth lifecycle, access guard, and secret-safe logging.

- [ ] **Step 1: Write the failing happy-path E2E test**

Override only `SmsService.sendOtp` and capture its `phone` and `otp` arguments. Drive this exact sequence over `/graphql`:

1. `sendSignupOtp(phone: "010-1234-5678")` returns a 5-minute expiry and `retryAfterSeconds: 60`.
2. `verifySignupOtp(phone: "01012345678", code: capturedOtp)` returns a verification token without returning the OTP.
3. `signUp` returns `User.phone === "01012345678"`, an access token, and a refresh token.
4. `currentUser` without a header returns `extensions.code === "UNAUTHENTICATED"`.
5. `currentUser` with the access Bearer header returns the created user.
6. Advance the test clock by one second; `refreshSession` then returns a different access token and refresh token but the same refresh expiry.
7. Reusing the prior refresh token returns `UNAUTHENTICATED`.
8. `logout` returns `true`, a second logout also returns `true`, and refresh after logout returns `UNAUTHENTICATED`.

- [ ] **Step 2: Write failure and replacement-login E2E tests**

Add exact assertions for:

- duplicate `sendSignupOtp` after signup returns `PHONE_NUMBER_ALREADY_REGISTERED`.
- unknown phone and wrong password both return `UNAUTHENTICATED` with the same public message.
- five wrong OTP attempts are recorded and the sixth attempt is rejected.
- a second login rotates the single refresh session; the old refresh token fails, while the previously issued access token still reaches `currentUser` before expiry.
- after Jest advances time beyond 15 minutes, the old access token returns `UNAUTHENTICATED`.

- [ ] **Step 3: Write the secret-leakage regression**

Spy on `Logger.prototype.log`, `Logger.prototype.error`, and `console.log`. Run OTP, signup, login, refresh failure, and logout with distinct marker values. Assert serialized log calls contain none of:

```text
01012345678
password-secret
captured OTP
verification token
access token
refresh token
```

The test may assert operation names such as `SignUp` are present; it must not weaken existing response-logger metadata assertions.

- [ ] **Step 4: Run the complete E2E suite**

Run:

```bash
yarn test:e2e --runInBand
```

Expected: PASS. If it fails, stop and diagnose the failing contract before changing implementation; do not add a new layer to bypass the assertion.

- [ ] **Step 5: Commit**

```bash
git add test/auth/auth.e2e-spec.ts
git commit -m "test: cover GraphQL authentication journey"
```

---

### Task 10: Final Verification and Knowledge Graph Update

**Files:**
- Verify: all files changed in Tasks 1-9
- Update: `schema.gql`
- Update: `graphify-out/` generated files through `graphify update .`

**Interfaces:**
- Consumes: the complete implementation and migrated test database.
- Produces: reproducible verification output and an updated project knowledge graph.

- [ ] **Step 1: Run all unit tests**

```bash
yarn test --runInBand
```

Expected: PASS with no open handles.

- [ ] **Step 2: Run PostgreSQL integration tests**

Run:

```bash
yarn test:integration --runInBand
```

Expected: all auth integration tests PASS against PostgreSQL.

- [ ] **Step 3: Run all E2E tests**

```bash
yarn test:e2e --runInBand
```

Expected: PASS, including the existing health/logging tests and new auth journey.

- [ ] **Step 4: Build and lint without broad rewrites**

```bash
yarn build
yarn eslint "{src,test}/**/*.ts"
```

Expected: both commands exit 0. Run Prettier only on files touched by this plan if formatting fails.

- [ ] **Step 5: Audit schema and secret logging**

```bash
rg -n "sendSignupOtp|verifySignupOtp|signUp|login|refreshSession|logout|currentUser" schema.gql
rg -n "phoneNumber" src test schema.gql
rg -n "console\.log|req\.body|accessToken|refreshToken|verificationToken|password|otp" src
```

Expected: approved operations are present; `phoneNumber` has no match; every secret-related match is a declaration, validation, hashing, comparison, or response field—not a logging call.

- [ ] **Step 6: Update Graphify**

```bash
graphify update .
```

Expected: graph update succeeds without shrinking/corrupting the existing graph.

- [ ] **Step 7: Review the final diff and commit generated artifacts**

```bash
git status --short
git diff --check
git diff --stat
git add schema.gql graphify-out/graph.json graphify-out/GRAPH_REPORT.md graphify-out/manifest.json graphify-out/cost.json
git commit -m "chore: update auth schema graph"
```

Expected: only task-related files are staged. Leave cache files and unrelated user changes unstaged, including any pre-existing `graphify-out/cache/last_query_stamp` change.
