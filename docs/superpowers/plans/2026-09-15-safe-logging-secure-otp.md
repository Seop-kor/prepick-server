# Safe Logging and Secure OTP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve useful production diagnostics without exposing request/response bodies, add masked context to SMS failures, and generate six-digit OTPs with a cryptographically secure source.

**Architecture:** Delete the request-body middleware and turn the existing global interceptor into a GraphQL-aware structured metadata logger. Keep service-specific context at the SMS failure boundary with phone masking, and replace `Math.random()` with Node's built-in `crypto.randomInt()` without changing public method contracts.

**Tech Stack:** NestJS 11, GraphQL/Apollo, RxJS, Node.js `node:crypto`, Jest 30, Supertest

**Spec:** `docs/superpowers/specs/2026-09-14-sensitive-safe-logging-secure-otp-design.md`

## Global Constraints

- Never log complete request bodies, response bodies, passwords, OTPs, tokens, SMS contents, provider credentials, external error messages, or error stacks.
- Global logs contain only `method`, `path`, `operationName`, `statusCode`, `durationMs`, `outcome`, and the error class name on failure.
- Read GraphQL `operationName` from parsed `GraphQLResolveInfo`; use `anonymous` when it is absent.
- SMS failure logs contain only `event`, masked `receiver`, and error class name, then rethrow the original error object.
- Generate OTPs with `randomInt(100000, 1000000)` and preserve `UtilService.getOtp(): string`.
- Preserve the existing GraphQL response behavior and Aligo request payload.
- Add no runtime dependency, redaction framework, request ID, tracing system, or new authentication endpoint.

## File Map

- Create `test/responseLogger.interceptor.spec.ts`: GraphQL success/failure metadata logging contract.
- Modify `src/responseLogger.interceptor.ts`: structured metadata logging without body access.
- Modify `test/app.e2e-spec.ts`: real-request regression proof for body non-disclosure.
- Modify `src/app.module.ts`: remove the unsafe middleware registration.
- Modify `test/app.module.spec.ts`: remove mocks for the deleted middleware.
- Delete `src/logger.middleware.ts`: remove the body-dumping middleware.
- Modify `test/common/sms.service.spec.ts`: masked failure-context and rethrow contract.
- Modify `src/common/sms.service.ts`: safe SMS failure logging.
- Create `test/common/util.service.spec.ts`: cryptographic OTP source contract.
- Modify `src/common/util.service.ts`: secure six-digit OTP generation.

---

### Task 1: Replace response-body logging with GraphQL metadata logging

**Files:**

- Create: `test/responseLogger.interceptor.spec.ts`
- Modify: `src/responseLogger.interceptor.ts:1-19`

**Interfaces:**

- Consumes: `ExecutionContext`, GraphQL context `{ req: Request }`, parsed `GraphQLResolveInfo`, and `CallHandler`.
- Produces: `ResponseLoggingInterceptor.intercept(context, next): Observable<unknown>` that passes through the original stream and logs safe metadata once on success or error.

- [ ] **Step 1: Create the failing interceptor tests**

Create `test/responseLogger.interceptor.spec.ts`:

```ts
import { CallHandler, ExecutionContext, Logger } from '@nestjs/common';
import { lastValueFrom, of, throwError } from 'rxjs';

import { ResponseLoggingInterceptor } from '../src/responseLogger.interceptor';

function graphqlContext(operationName?: string): ExecutionContext {
  const request = {
    method: 'POST',
    originalUrl: '/graphql',
    body: { password: 'request-secret' },
    res: { statusCode: 200 },
  };
  const info = {
    operation: { name: operationName ? { value: operationName } : undefined },
  };

  return {
    getType: () => 'graphql',
    getArgs: () => [{}, {}, { req: request }, info],
    getClass: () => class TestResolver {},
    getHandler: () => () => undefined,
  } as unknown as ExecutionContext;
}

describe('ResponseLoggingInterceptor', () => {
  afterEach(() => jest.restoreAllMocks());

  it('logs GraphQL metadata without request or response bodies', async () => {
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation();
    const next = {
      handle: () => of({ token: 'response-secret' }),
    } as CallHandler;

    await lastValueFrom(
      new ResponseLoggingInterceptor().intercept(
        graphqlContext('SendEmail'),
        next,
      ),
    );

    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        path: '/graphql',
        operationName: 'SendEmail',
        statusCode: 200,
        durationMs: expect.any(Number),
        outcome: 'success',
      }),
    );
    expect(JSON.stringify(log.mock.calls)).not.toContain('request-secret');
    expect(JSON.stringify(log.mock.calls)).not.toContain('response-secret');
  });

  it('uses anonymous for an unnamed GraphQL operation', async () => {
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation();

    await lastValueFrom(
      new ResponseLoggingInterceptor().intercept(graphqlContext(), {
        handle: () => of(true),
      } as CallHandler),
    );

    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({ operationName: 'anonymous' }),
    );
  });

  it('logs only the error class when a request fails', async () => {
    const errorLog = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const next = {
      handle: () => throwError(() => new Error('response-secret')),
    } as CallHandler;

    await expect(
      lastValueFrom(
        new ResponseLoggingInterceptor().intercept(
          graphqlContext('SendEmail'),
          next,
        ),
      ),
    ).rejects.toThrow('response-secret');

    expect(errorLog).toHaveBeenCalledWith(
      expect.objectContaining({
        operationName: 'SendEmail',
        statusCode: 500,
        outcome: 'error',
        error: 'Error',
      }),
    );
    expect(JSON.stringify(errorLog.mock.calls)).not.toContain(
      'response-secret',
    );
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
yarn test test/responseLogger.interceptor.spec.ts --runInBand --no-watchman
```

Expected: FAIL because the current interceptor writes response data with `console.log` and emits no structured metadata.

- [ ] **Step 3: Implement the minimum safe interceptor**

Replace `src/responseLogger.interceptor.ts` with:

```ts
import {
  CallHandler,
  ExecutionContext,
  HttpException,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { Request, Response } from 'express';
import type { GraphQLResolveInfo } from 'graphql';
import { Observable, tap } from 'rxjs';

@Injectable()
export class ResponseLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ResponseLoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const gqlContext =
      context.getType<string>() === 'graphql'
        ? GqlExecutionContext.create(context)
        : undefined;
    const request = gqlContext
      ? gqlContext.getContext<{ req: Request }>().req
      : context.switchToHttp().getRequest<Request>();
    const response =
      request.res ?? context.switchToHttp().getResponse<Response>();
    const operationName =
      gqlContext?.getInfo<GraphQLResolveInfo>().operation.name?.value ??
      'anonymous';
    const startedAt = Date.now();
    const metadata = (statusCode: number) => ({
      method: request.method,
      path: request.originalUrl ?? request.url,
      operationName,
      statusCode,
      durationMs: Date.now() - startedAt,
    });

    return next.handle().pipe(
      tap({
        next: () =>
          this.logger.log({
            ...metadata(response?.statusCode ?? 200),
            outcome: 'success',
          }),
        error: (error: unknown) =>
          this.logger.error({
            ...metadata(
              error instanceof HttpException ? error.getStatus() : 500,
            ),
            outcome: 'error',
            error: error instanceof Error ? error.name : 'UnknownError',
          }),
      }),
    );
  }
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
yarn test test/responseLogger.interceptor.spec.ts --runInBand --no-watchman
```

Expected: PASS with three tests and no sensitive value in captured log calls.

- [ ] **Step 5: Commit the interceptor change**

```bash
git add src/responseLogger.interceptor.ts test/responseLogger.interceptor.spec.ts
git commit -m "fix: replace response body logs with metadata"
```

---

### Task 2: Remove the global request-body logger

**Files:**

- Modify: `test/app.e2e-spec.ts:7-32`
- Modify: `src/app.module.ts:1-40`
- Modify: `test/app.module.spec.ts:1-51`
- Delete: `src/logger.middleware.ts`

**Interfaces:**

- Consumes: the metadata-only `ResponseLoggingInterceptor` from Task 1.
- Produces: an `AppModule` that registers no middleware capable of reading or printing request bodies.

- [ ] **Step 1: Add the failing E2E regression test**

Add this test after the existing health-check test in `test/app.e2e-spec.ts`:

```ts
it('does not write request bodies to the console', async () => {
  const consoleLog = jest.spyOn(console, 'log').mockImplementation();

  await request(app.getHttpServer())
    .post('/graphql')
    .send({ query: '{ healthCheck }', password: 'request-secret' })
    .expect(200);

  expect(JSON.stringify(consoleLog.mock.calls)).not.toContain('request-secret');
});
```

Change the existing cleanup to restore the spy:

```ts
afterEach(async () => {
  jest.restoreAllMocks();
  await app.close();
});
```

- [ ] **Step 2: Run the E2E suite and verify RED**

Run:

```bash
yarn test:e2e --runInBand --no-watchman
```

Expected: FAIL because `LoggerMiddleware.use()` currently passes `req.body` to `console.log`. A restricted sandbox must permit the test server to bind a local port.

- [ ] **Step 3: Remove the middleware and its registration**

In `src/app.module.ts`, change the Nest common import to:

```ts
import { Module } from '@nestjs/common';
```

Remove this import:

```ts
import { LoggerMiddleware } from './logger.middleware';
```

Replace the class declaration and `configure()` method with:

```ts
export class AppModule {}
```

Delete `src/logger.middleware.ts`.

In `test/app.module.spec.ts`, delete these cleanup and mock statements because `AppModule` no longer imports the middleware:

```ts
jest.dontMock('../src/logger.middleware');
```

```ts
jest.doMock('../src/logger.middleware', () => ({
  LoggerMiddleware: class MockLoggerMiddleware {},
}));
```

- [ ] **Step 4: Run the affected tests and verify GREEN**

Run:

```bash
yarn test test/app.module.spec.ts --runInBand --no-watchman
yarn test:e2e --runInBand --no-watchman
```

Expected: both commands PASS; health-check behavior remains unchanged and the captured console output contains no request secret.

- [ ] **Step 5: Commit the request logger removal**

```bash
git add src/app.module.ts src/logger.middleware.ts test/app.module.spec.ts test/app.e2e-spec.ts
git commit -m "fix: stop logging request bodies"
```

---

### Task 3: Add masked context to SMS failures

**Files:**

- Modify: `test/common/sms.service.spec.ts:1-23`
- Modify: `src/common/sms.service.ts:1-35`

**Interfaces:**

- Consumes: `SmsService.send(phone: string, message: string): Promise<boolean>` and the existing Aligo HTTP request.
- Produces: the same success value and original thrown error, plus a safe failure record `{ event, receiver, error }`.

- [ ] **Step 1: Add the failing SMS failure test**

Add this import to `test/common/sms.service.spec.ts`:

```ts
import { Logger } from '@nestjs/common';
```

Add cleanup inside the existing `describe` block:

```ts
afterEach(() => jest.restoreAllMocks());
```

Add this test after the existing success-path test:

```ts
it('logs a masked receiver without sensitive values when sending fails', async () => {
  const errorLog = jest.spyOn(Logger.prototype, 'error').mockImplementation();
  const post = jest.fn().mockRejectedValue(new Error('provider-secret'));
  const smsService = new SmsService({
    axiosRef: { post },
  } as unknown as HttpService);

  await expect(smsService.sendOtp('01012345678', '123456')).rejects.toThrow(
    'provider-secret',
  );

  expect(errorLog).toHaveBeenCalledWith({
    event: 'sms.send.failed',
    receiver: '010****5678',
    error: 'Error',
  });
  expect(JSON.stringify(errorLog.mock.calls)).not.toContain('01012345678');
  expect(JSON.stringify(errorLog.mock.calls)).not.toContain('123456');
  expect(JSON.stringify(errorLog.mock.calls)).not.toContain('provider-secret');
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
yarn test test/common/sms.service.spec.ts --runInBand --no-watchman
```

Expected: FAIL because `SmsService` currently emits no safe failure record.

- [ ] **Step 3: Log only masked SMS failure context**

Change the Nest import in `src/common/sms.service.ts` to:

```ts
import { Injectable, Logger } from '@nestjs/common';
```

Add this field to `SmsService`:

```ts
private readonly logger = new Logger(SmsService.name);
```

Replace `send()` with:

```ts
async send(phone: string, message: string): Promise<boolean> {
  try {
    const res = await this.httpService.axiosRef.post(
      `${process.env.ALIGO_API_URL}/send/`,
      {
        key: process.env.ALIGO_API_KEY,
        user_id: process.env.ALIGO_API_USER_ID,
        sender: process.env.ALIGO_API_SENDER,
        receiver: phone,
        msg: message,
        testmode_yn: 'Y',
      },
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );

    if (res.status !== 200) {
      throw new Error(res.statusText);
    }

    return true;
  } catch (error) {
    this.logger.error({
      event: 'sms.send.failed',
      receiver:
        phone.length >= 7
          ? `${phone.slice(0, 3)}****${phone.slice(-4)}`
          : '[REDACTED]',
      error: error instanceof Error ? error.name : 'UnknownError',
    });
    throw error;
  }
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
yarn test test/common/sms.service.spec.ts --runInBand --no-watchman
```

Expected: PASS; the existing success-path payload assertion also remains green.

- [ ] **Step 5: Commit the SMS logging change**

```bash
git add src/common/sms.service.ts test/common/sms.service.spec.ts
git commit -m "fix: mask receiver in SMS failure logs"
```

---

### Task 4: Generate OTPs with Node's cryptographic RNG

**Files:**

- Create: `test/common/util.service.spec.ts`
- Modify: `src/common/util.service.ts:1-10`

**Interfaces:**

- Consumes: `node:crypto.randomInt(min: number, max: number): number`.
- Produces: unchanged `UtilService.getOtp(): string`, returning `100000` through `999999` as six decimal characters.

- [ ] **Step 1: Create the failing secure-source test**

Create `test/common/util.service.spec.ts`:

```ts
import { randomInt } from 'node:crypto';

import { UtilService } from '../../src/common/util.service';

jest.mock('node:crypto', () => ({
  randomInt: jest.fn(() => 654321),
}));

describe('UtilService', () => {
  it('generates a six-digit OTP with the cryptographic RNG', () => {
    expect(new UtilService().getOtp()).toBe('654321');
    expect(randomInt).toHaveBeenCalledWith(100000, 1000000);
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
yarn test test/common/util.service.spec.ts --runInBand --no-watchman
```

Expected: FAIL because `getOtp()` currently uses `Math.random()` and never calls `randomInt()`.

- [ ] **Step 3: Replace the insecure random source**

Replace `src/common/util.service.ts` with:

```ts
import { Injectable } from '@nestjs/common';
import { randomInt } from 'node:crypto';

@Injectable()
export class UtilService {
  getOtp(): string {
    return randomInt(100000, 1000000).toString();
  }
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
yarn test test/common/util.service.spec.ts --runInBand --no-watchman
```

Expected: PASS.

- [ ] **Step 5: Commit the OTP change**

```bash
git add src/common/util.service.ts test/common/util.service.spec.ts
git commit -m "fix: generate OTPs with crypto randomInt"
```

---

### Task 5: Verify the PR and refresh Graphify

**Files:**

- Update: tracked generated files changed by `graphify update .`

**Interfaces:**

- Consumes: all changes from Tasks 1–4.
- Produces: a buildable, tested change set and a knowledge graph synchronized with the source.

- [ ] **Step 1: Run all unit tests**

Run:

```bash
yarn test --runInBand --no-watchman
```

Expected: all unit test suites PASS.

- [ ] **Step 2: Run all E2E tests**

Run:

```bash
yarn test:e2e --runInBand --no-watchman
```

Expected: all E2E tests PASS. A restricted sandbox must permit binding a local test port.

- [ ] **Step 3: Run the TypeScript build**

Run:

```bash
yarn build
```

Expected: exit code 0 with no TypeScript errors.

- [ ] **Step 4: Search for remaining body logging**

Run:

```bash
rg -n "console\\.|req\\.body|JSON\\.stringify\\(data\\)" src
```

Expected: no source match that prints or serializes a request or response body.

- [ ] **Step 5: Refresh the repository graph**

Run:

```bash
graphify update .
```

Expected: the graph records the deleted middleware, updated interceptor, SMS failure path, and secure OTP source.

- [ ] **Step 6: Review the final diff without staging user-owned Graphify files**

Run:

```bash
git status --short
git diff --check
git diff --stat
git diff -- src test docs/superpowers/plans
```

Expected: no whitespace errors or unrelated source changes. Pre-existing untracked learning and memory files under `graphify-out/` remain unstaged.

- [ ] **Step 7: Commit tracked Graphify updates only when generated files changed**

Run `git diff --quiet -- graphify-out` first. If it exits with status 1, run:

```bash
git add -u graphify-out
git commit -m "chore: update code knowledge graph"
```

Expected: only tracked generated graph files are committed; pre-existing untracked learning and memory files remain untouched.
