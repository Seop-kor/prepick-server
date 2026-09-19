# PostgreSQL·MikroORM Foundation Implementation Plan

> **For agentic workers:** Use `superpowers:executing-plans` to execute this plan task-by-task.

**Goal:** Connect the NestJS application to PostgreSQL through MikroORM and provide a real-database integration test harness without managing database schema in this repository.

**Architecture:** `ConfigModule` loads `DATABASE_URL`. `MikroOrmModule.forRootAsync(...)` passes it to a shared options factory that configures PostgreSQL and entity discovery. Database administrators create and alter tables manually outside this repository; the application account has no DDL privileges.

**Tech Stack:** NestJS 11, `@nestjs/config`, MikroORM 7.2.1, PostgreSQL, Jest 30, ts-jest, Yarn 1

**Spec:** `docs/superpowers/specs/2026-09-19-postgresql-mikroorm-foundation-design.md`

## Global Constraints

- Keep `@mikro-orm/core`, `@mikro-orm/postgresql`, and `@mikro-orm/nestjs`.
- Load application environment variables through the existing global `ConfigModule`.
- Keep `DATABASE_URL` as the only database connection variable.
- Discover compiled entities from `dist/**/*.entity.js` and TypeScript entities from `src/**/*.entity.ts`.
- Set `autoLoadEntities: true`, `registerRequestContext: true`, and `discovery.warnWhenNoEntities: false`.
- Do not add migration tooling, MikroORM CLI configuration, SQL files, schema sync, seed data, Docker, Testcontainers, or an in-memory database.
- Database administrators provision tables manually outside this repository.
- The application DB role must not have DDL privileges.

## Task 1: Runtime MikroORM options

**Files:**

- Create: `src/mikro-orm.options.ts`
- Create: `test/database/mikro-orm.options.spec.ts`
- Modify: `src/app.module.ts`
- Modify: `test/app.module.spec.ts`

- [ ] Validate `DATABASE_URL` without exposing its value in errors.
- [ ] Configure PostgreSQL and entity discovery only.
- [ ] Register MikroORM asynchronously through `ConfigService`.
- [ ] Verify focused unit tests and build.

```bash
yarn test test/database/mikro-orm.options.spec.ts test/app.module.spec.ts --runInBand
yarn build
```

## Task 2: PostgreSQL integration harness

**Files:**

- Create: `test/jest-integration.json`
- Create: `test/database/database.integration-spec.ts`
- Modify: `package.json`

- [ ] Keep integration tests separate from the default Jest suite.
- [ ] Build `AppModule` against the configured PostgreSQL database.
- [ ] Verify that PostgreSQL `EntityManager` is injectable.
- [ ] Close the NestJS testing module after every test.

```bash
yarn test:integration --listTests
yarn test:integration test/database/database.integration-spec.ts --runInBand
```

## Task 3: Final verification

```bash
yarn build
yarn test --runInBand
yarn test:integration --runInBand
graphify update .
```

Authentication work can begin after the database administrator confirms that its tables and constraints exist in the target database.
