# PostgreSQL·MikroORM Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Connect the NestJS application and MikroORM CLI to the configured PostgreSQL database and provide a real-database integration test harness required by the consumer authentication plan.

**Architecture:** A pure `createMikroOrmOptions(clientUrl)` function owns shared entity discovery, migration, and PostgreSQL options. The NestJS runtime obtains `DATABASE_URL` from the existing global `ConfigModule`, while a thin CLI config loads the same local env file with `dotenv`; both call the shared function. PostgreSQL-specific tests run through a separate Jest config and never use an in-memory persistence fallback.

**Tech Stack:** NestJS 11, `@nestjs/config`, MikroORM 7.2.1, PostgreSQL, dotenv, Jest 30, ts-jest, tsx, Yarn 1

**Spec:** `docs/superpowers/specs/2026-09-19-postgresql-mikroorm-foundation-design.md`

## Global Constraints

- Preserve the user-added `@mikro-orm/core@7.2.1`, `@mikro-orm/nestjs@7.1.0`, `@mikro-orm/postgresql@7.2.1`, and current `yarn.lock` changes.
- Keep `@mikro-orm/core`, `@mikro-orm/postgresql`, `@mikro-orm/migrations`, and `@mikro-orm/cli` aligned at exactly `7.2.1`.
- Continue loading application environment variables with `ConfigModule.forRoot({ isGlobal: true, envFilePath: 'environments/.env' })`.
- The CLI alone may load `environments/.env` with `dotenv`; no database secret may be hard-coded, logged, committed, or copied into a test fixture.
- Keep `DATABASE_URL` as the only database connection variable.
- Discover compiled entities from `dist/**/*.entity.js` and TypeScript entities from `src/**/*.entity.ts`.
- Store compiled migrations under `dist/database/migrations` and TypeScript migrations under `src/database/migrations`.
- Set `autoLoadEntities: true`, `registerRequestContext: true`, and `discovery.warnWhenNoEntities: false`.
- Do not create application tables, auth entities, seed data, repository interfaces, Docker configuration, Testcontainers, or an in-memory database.
- Do not run migrations automatically during application bootstrap and do not automate `schema:fresh` or another destructive schema command.
- The existing `DATABASE_URL` points to a disposable development/test database where integration-test cleanup is allowed.

## File Map

- Create `src/database/mikro-orm.options.ts`: pure shared PostgreSQL, entity-discovery, and migration options factory.
- Create `src/mikro-orm.config.ts`: MikroORM CLI entry point that loads the local env file without booting NestJS.
- Create `src/database/migrations/.gitkeep`: retain the migration directory before the auth migration exists.
- Modify `src/app.module.ts`: initialize MikroORM asynchronously through the existing global `ConfigModule`.
- Modify `package.json`: add migration tooling, CLI discovery settings, the integration-test script, and default-test exclusion.
- Modify `yarn.lock`: lock the added packages while preserving the user's existing MikroORM additions.
- Modify `test/app.module.spec.ts`: pin the ConfigService-to-MikroORM runtime contract.
- Create `test/database/mikro-orm.options.spec.ts`: pin shared URL, entity, migration, and extension options.
- Create `test/database/mikro-orm.config.spec.ts`: pin CLI environment behavior and missing-URL failure.
- Create `test/database/database.integration-spec.ts`: prove a real PostgreSQL connection opens and closes.
- Create `test/jest-integration.json`: isolate `*.integration-spec.ts` files.

## Review Focus

- A `DATABASE_URL` containing encoded password characters and query parameters must pass to MikroORM unchanged; pinned in Task 1.
- A missing `DATABASE_URL` must fail with a stable message that does not expose another secret; pinned in Task 2.
- A process-provided `DATABASE_URL` must win over `environments/.env` in the CLI path; pinned in Task 2.
- The foundation must initialize successfully before any entity exists; pinned by `warnWhenNoEntities: false`, the CLI debug command, and the PostgreSQL smoke test in Tasks 1 and 3.
- Default Jest discovery must exclude integration specs while integration discovery includes them; pinned by list-tests checks in Task 3.

---

### Task 1: Shared MikroORM Options and Aligned Dependencies

**Files:**
- Create: `src/database/mikro-orm.options.ts`
- Create: `test/database/mikro-orm.options.spec.ts`
- Modify: `package.json`
- Modify: `yarn.lock`

**Interfaces:**
- Consumes: a PostgreSQL connection string supplied as `clientUrl: string`.
- Produces: `createMikroOrmOptions(clientUrl: string)`, returning MikroORM PostgreSQL options used by both `AppModule` and `src/mikro-orm.config.ts`.

- [ ] **Step 1: Record the clean code baseline without altering user dependency changes**

Run:

```bash
yarn build
yarn test --runInBand
git status --short
```

Expected: build and existing tests PASS. `package.json`, `yarn.lock`, and `graphify-out/cache/last_query_stamp` may already be modified; do not discard them.

- [ ] **Step 2: Write the failing shared-options test**

Create `test/database/mikro-orm.options.spec.ts`:

```ts
import { Migrator } from '@mikro-orm/migrations';

import { createMikroOrmOptions } from '../../src/database/mikro-orm.options';

describe('createMikroOrmOptions', () => {
  it('preserves the database URL and configures discovery and migrations', () => {
    const clientUrl =
      'postgresql://app:p%40ss@db.example:5432/prepick?sslmode=require';

    const options = createMikroOrmOptions(clientUrl);

    expect(options.clientUrl).toBe(clientUrl);
    expect(options.entities).toEqual(['dist/**/*.entity.js']);
    expect(options.entitiesTs).toEqual(['src/**/*.entity.ts']);
    expect(options.discovery).toEqual({ warnWhenNoEntities: false });
    expect(options.extensions).toContain(Migrator);
    expect(options.migrations).toEqual(
      expect.objectContaining({
        emit: 'ts',
        path: 'dist/database/migrations',
        pathTs: 'src/database/migrations',
      }),
    );
  });
});
```

This test catches URL normalization, wrong discovery paths, failure before auth entities exist, and migration path drift.

- [ ] **Step 3: Run the focused test and verify RED**

Run:

```bash
yarn test test/database/mikro-orm.options.spec.ts --runInBand
```

Expected: FAIL because `@mikro-orm/migrations` and `src/database/mikro-orm.options.ts` do not exist.

- [ ] **Step 4: Install the remaining aligned packages**

Run:

```bash
yarn add --exact @mikro-orm/core@7.2.1 @mikro-orm/postgresql@7.2.1 @mikro-orm/migrations@7.2.1 dotenv@17.4.1
yarn add --dev --exact @mikro-orm/cli@7.2.1 tsx
```

Expected: `package.json` retains `@mikro-orm/nestjs@^7.1.0`, pins the four MikroORM monorepo packages to `7.2.1`, adds `dotenv`, `@mikro-orm/cli`, and `tsx`, and updates `yarn.lock` without removing unrelated dependencies.

- [ ] **Step 5: Implement the shared options factory**

Create `src/database/mikro-orm.options.ts`:

```ts
import { Migrator } from '@mikro-orm/migrations';
import { defineConfig } from '@mikro-orm/postgresql';

export function createMikroOrmOptions(clientUrl: string) {
  return defineConfig({
    clientUrl,
    entities: ['dist/**/*.entity.js'],
    entitiesTs: ['src/**/*.entity.ts'],
    discovery: { warnWhenNoEntities: false },
    extensions: [Migrator],
    migrations: {
      emit: 'ts',
      path: 'dist/database/migrations',
      pathTs: 'src/database/migrations',
    },
  });
}
```

- [ ] **Step 6: Run the focused test and build**

Run:

```bash
yarn test test/database/mikro-orm.options.spec.ts --runInBand
yarn build
```

Expected: the focused test PASSes and TypeScript compilation succeeds without changing the package module type.

- [ ] **Step 7: Commit the shared options and dependencies**

```bash
git add package.json yarn.lock src/database/mikro-orm.options.ts test/database/mikro-orm.options.spec.ts
git commit -m "feat: configure PostgreSQL ORM options"
```

---

### Task 2: NestJS Runtime and MikroORM CLI Configuration

**Files:**
- Create: `src/mikro-orm.config.ts`
- Create: `test/database/mikro-orm.config.spec.ts`
- Modify: `src/app.module.ts`
- Modify: `test/app.module.spec.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `createMikroOrmOptions(clientUrl: string)` from Task 1, the global `ConfigService`, and `process.env.DATABASE_URL` in the CLI process.
- Produces: an async NestJS MikroORM registration with request context and entity auto-loading, plus the default export consumed by `yarn mikro-orm ...`.

- [ ] **Step 1: Replace the AppModule test with a failing runtime-registration test**

Replace `test/app.module.spec.ts` with:

```ts
describe('AppModule configuration', () => {
  afterEach(() => {
    jest.resetModules();
    jest.dontMock('@mikro-orm/nestjs');
    jest.dontMock('@nestjs/config');
    jest.dontMock('@nestjs/graphql');
    jest.dontMock('@nestjs/apollo');
    jest.dontMock('../src/common/common.module');
  });

  it('loads the env file and configures MikroORM from ConfigService', () => {
    jest.isolateModules(() => {
      class MockConfigService {}

      const configForRoot = jest.fn(() => ({
        module: class MockConfigModule {},
      }));
      const mikroOrmForRootAsync = jest.fn(() => ({
        module: class MockMikroOrmModule {},
      }));

      jest.doMock('@nestjs/config', () => ({
        ConfigModule: { forRoot: configForRoot },
        ConfigService: MockConfigService,
      }));
      jest.doMock('@mikro-orm/nestjs', () => ({
        MikroOrmModule: { forRootAsync: mikroOrmForRootAsync },
      }));
      jest.doMock('@nestjs/graphql', () => ({
        GraphQLModule: {
          forRoot: jest.fn(() => ({
            module: class MockGraphQLModule {},
          })),
        },
      }));
      jest.doMock('@nestjs/apollo', () => ({
        ApolloDriver: class MockApolloDriver {},
      }));
      jest.doMock('../src/common/common.module', () => ({
        CommonModule: class MockCommonModule {},
      }));

      require('../src/app.module');

      expect(configForRoot).toHaveBeenCalledWith({
        isGlobal: true,
        envFilePath: 'environments/.env',
      });

      const [asyncOptions] = mikroOrmForRootAsync.mock.calls[0] as unknown as [
        {
          inject: unknown[];
          useFactory: (config: {
            getOrThrow: (key: string) => string;
          }) => Record<string, unknown>;
        },
      ];
      const getOrThrow = jest
        .fn<(key: string) => string>()
        .mockReturnValue('postgresql://runtime-database');

      expect(asyncOptions.inject).toEqual([MockConfigService]);
      expect(asyncOptions.useFactory({ getOrThrow })).toEqual(
        expect.objectContaining({
          clientUrl: 'postgresql://runtime-database',
          autoLoadEntities: true,
          registerRequestContext: true,
        }),
      );
      expect(getOrThrow).toHaveBeenCalledWith('DATABASE_URL');
    });
  });
});
```

- [ ] **Step 2: Write failing CLI configuration tests**

Create `test/database/mikro-orm.config.spec.ts`:

```ts
describe('MikroORM CLI configuration', () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;

  afterEach(() => {
    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }
    jest.resetModules();
    jest.dontMock('dotenv');
  });

  it('uses a process-provided DATABASE_URL without changing it', () => {
    const clientUrl =
      'postgresql://ci:p%40ss@db.example:5432/prepick?sslmode=require';
    process.env.DATABASE_URL = clientUrl;
    jest.doMock('dotenv', () => ({
      config: ({ override }: { override?: boolean }) => {
        if (override) {
          process.env.DATABASE_URL = 'postgresql://file-database';
        }
        return { parsed: {} };
      },
    }));

    let options: { clientUrl?: string } | undefined;
    jest.isolateModules(() => {
      options = require('../../src/mikro-orm.config').default;
    });

    expect(options?.clientUrl).toBe(clientUrl);
  });

  it('fails without exposing a connection string when DATABASE_URL is missing', () => {
    delete process.env.DATABASE_URL;
    jest.doMock('dotenv', () => ({ config: jest.fn() }));

    expect(() => {
      jest.isolateModules(() => {
        require('../../src/mikro-orm.config');
      });
    }).toThrow('DATABASE_URL is required');
  });
});
```

- [ ] **Step 3: Run both tests and verify RED**

Run:

```bash
yarn test test/app.module.spec.ts test/database/mikro-orm.config.spec.ts --runInBand
```

Expected: FAIL because `AppModule` does not register MikroORM and `src/mikro-orm.config.ts` does not exist.

- [ ] **Step 4: Register MikroORM through ConfigService**

Modify the relevant imports in `src/app.module.ts`:

```ts
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { createMikroOrmOptions } from './database/mikro-orm.options';
```

Add this entry immediately after `ConfigModule.forRoot(...)` in the `imports` array:

```ts
MikroOrmModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => ({
    ...createMikroOrmOptions(
      configService.getOrThrow<string>('DATABASE_URL'),
    ),
    autoLoadEntities: true,
    registerRequestContext: true,
  }),
}),
```

Do not remove or duplicate the existing `ConfigModule.forRoot(...)` call.

- [ ] **Step 5: Implement the CLI adapter**

Create `src/mikro-orm.config.ts`:

```ts
import { config as loadEnv } from 'dotenv';

import { createMikroOrmOptions } from './database/mikro-orm.options';

loadEnv({
  path: 'environments/.env',
  override: false,
  quiet: true,
});

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

export default createMikroOrmOptions(databaseUrl);
```

- [ ] **Step 6: Add explicit MikroORM CLI discovery settings**

Add this top-level field to `package.json`:

```json
"mikro-orm": {
  "preferTs": true,
  "configPaths": [
    "./src/mikro-orm.config.ts",
    "./dist/mikro-orm.config.js"
  ]
}
```

Do not add a `mikro-orm` package script; Yarn should invoke the locally installed CLI binary directly.

- [ ] **Step 7: Run the focused tests and build**

Run:

```bash
yarn test test/app.module.spec.ts test/database/mikro-orm.config.spec.ts --runInBand
yarn build
```

Expected: both focused suites PASS and the compiled `dist/mikro-orm.config.js` exists.

- [ ] **Step 8: Commit runtime and CLI configuration**

```bash
git add src/app.module.ts src/mikro-orm.config.ts test/app.module.spec.ts test/database/mikro-orm.config.spec.ts package.json
git commit -m "feat: connect NestJS and MikroORM configuration"
```

---

### Task 3: PostgreSQL Integration Test and Migration Harness

**Files:**
- Create: `src/database/migrations/.gitkeep`
- Create: `test/jest-integration.json`
- Create: `test/database/database.integration-spec.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: the default MikroORM options from `src/mikro-orm.config.ts` and the disposable PostgreSQL database referenced by `DATABASE_URL`.
- Produces: `yarn test:integration`, a tracked TypeScript migration directory, and executable CLI connectivity proof for the consumer auth plan.

- [ ] **Step 1: Write the PostgreSQL smoke test**

Create `test/database/database.integration-spec.ts`:

```ts
import { MikroORM } from '@mikro-orm/postgresql';

import mikroOrmConfig from '../../src/mikro-orm.config';

describe('PostgreSQL database foundation', () => {
  let orm: Awaited<ReturnType<typeof MikroORM.init>> | undefined;

  afterEach(async () => {
    await orm?.close(true);
    orm = undefined;
  });

  it('connects to the configured PostgreSQL database', async () => {
    orm = await MikroORM.init(mikroOrmConfig);

    await expect(orm.checkConnection()).resolves.toEqual({ ok: true });
  });
});
```

This test performs no schema or data mutation.

- [ ] **Step 2: Verify the integration command is RED**

Run:

```bash
yarn test:integration --listTests
```

Expected: FAIL with `Command "test:integration" not found`.

- [ ] **Step 3: Add the integration Jest configuration**

Create `test/jest-integration.json`:

```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": "..",
  "testEnvironment": "node",
  "testRegex": "test/.*\\.integration-spec\\.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  }
}
```

Add this script to `package.json`:

```json
"test:integration": "jest --config ./test/jest-integration.json"
```

Add this field to the existing top-level `jest` object so the default suite does not duplicate PostgreSQL integration specs:

```json
"testPathIgnorePatterns": [
  "<rootDir>/test/.*\\.integration-spec\\.ts$"
]
```

- [ ] **Step 4: Retain the migration directory**

Create the empty file `src/database/migrations/.gitkeep`. Do not create a no-op migration; the consumer auth plan owns the first schema migration.

- [ ] **Step 5: Verify Jest discovery boundaries**

Run:

```bash
yarn test:integration --listTests
yarn test --listTests
```

Expected: the integration command lists `test/database/database.integration-spec.ts`; the default command does not list that file and continues listing existing unit and e2e specs.

- [ ] **Step 6: Run the real PostgreSQL smoke test**

Run:

```bash
yarn test:integration test/database/database.integration-spec.ts --runInBand
```

Expected: PASS with one successful connection test. If it fails, diagnose the configured host, TLS, database permissions, or URL encoding; do not replace PostgreSQL with a mock.

- [ ] **Step 7: Verify the CLI against PostgreSQL before any entity exists**

Run:

```bash
yarn mikro-orm debug
yarn mikro-orm migration:list
```

Expected: the CLI finds `src/mikro-orm.config.ts`, accepts zero discovered auth entities, connects to PostgreSQL, and prints an empty or current migration list without exposing `DATABASE_URL`.

- [ ] **Step 8: Run existing tests and build**

Run:

```bash
yarn test --runInBand
yarn build
```

Expected: all existing non-integration tests PASS and the project builds.

- [ ] **Step 9: Commit the integration harness**

```bash
git add package.json test/jest-integration.json test/database/database.integration-spec.ts src/database/migrations/.gitkeep
git commit -m "test: add PostgreSQL integration harness"
```

---

### Task 4: Auth Prerequisite Verification and Knowledge Graph Update

**Files:**
- Verify: `package.json`
- Verify: `src/mikro-orm.config.ts`
- Verify: `src/database/migrations/`
- Update: tracked `graphify-out/` outputs produced by `graphify update .`

**Interfaces:**
- Consumes: the completed database foundation from Tasks 1-3.
- Produces: evidence that `docs/superpowers/plans/2026-09-19-consumer-auth-api.md` Task 0 is satisfied and an updated repository knowledge graph.

- [ ] **Step 1: Verify all required packages resolve once**

Run:

```bash
yarn why @mikro-orm/core
yarn why @mikro-orm/nestjs
yarn why @mikro-orm/postgresql
yarn why @mikro-orm/migrations
yarn why @mikro-orm/cli
```

Expected: every command reports one installed version; core, PostgreSQL, migrations, and CLI report `7.2.1`.

- [ ] **Step 2: Re-run the consumer-auth prerequisite contract**

Run:

```bash
yarn mikro-orm debug
yarn mikro-orm migration:list
yarn test:integration --listTests
```

Expected: entity discovery and PostgreSQL connectivity succeed, migration status prints, and the database smoke test is discovered.

- [ ] **Step 3: Run the complete verification set**

Run:

```bash
yarn build
yarn test --runInBand
yarn test:integration --runInBand
```

Expected: build, all existing tests, and the real PostgreSQL integration test PASS.

- [ ] **Step 4: Refresh the knowledge graph**

Run:

```bash
graphify update .
git status --short
```

Expected: graphify completes successfully and reports the database configuration and tests as changed or added nodes. Preserve the pre-existing `graphify-out/cache/last_query_stamp` working-tree change.

- [ ] **Step 5: Commit tracked knowledge-graph updates without the query stamp**

```bash
git add -u -- graphify-out ':(exclude)graphify-out/cache/last_query_stamp'
git commit -m "docs: refresh database knowledge graph"
```

Expected: tracked graph outputs are committed while `graphify-out/cache/last_query_stamp` remains unstaged. If `graphify update .` makes no tracked change, skip this commit.

- [ ] **Step 6: Confirm the handoff state**

Run:

```bash
git status --short
git log -4 --oneline
```

Expected: no foundation source or test files remain uncommitted; only the known query-stamp change may remain. The consumer authentication plan can resume at Task 1 because its Task 0 commands now pass.
