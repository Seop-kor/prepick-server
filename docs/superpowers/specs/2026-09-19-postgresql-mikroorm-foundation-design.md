# PostgreSQL·MikroORM 기반 설계

## 배경

Consumer 인증 API는 PostgreSQL 트랜잭션, unique constraint, advisory lock과 pessimistic row lock을 사용한다. 현재 프로젝트에는 PostgreSQL driver와 NestJS용 MikroORM 모듈은 설치되어 있고, 로컬 `environments/.env`에 테스트 데이터를 초기화해도 되는 PostgreSQL의 `DATABASE_URL`이 설정되어 있다.

이 작업은 인증 기능보다 먼저 공통 DB 연결과 migration·integration test 실행 기반만 제공한다. 사용자, OTP, refresh session 테이블과 인증 로직은 후속 인증 작업에서 구현한다.

## 목표

- NestJS 애플리케이션이 `DATABASE_URL`로 PostgreSQL에 연결한다.
- feature module이 `MikroOrmModule.forFeature(...)`로 등록한 entity를 자동으로 발견한다.
- HTTP·GraphQL 요청마다 분리된 EntityManager context를 사용한다.
- TypeScript migration을 생성·조회·적용할 수 있다.
- 실제 PostgreSQL을 사용하는 integration test를 별도 Jest 설정으로 실행한다.
- 인증 구현 계획의 DB 선행조건 명령이 모두 성공한다.

## 제외 범위

- PostgreSQL 서버나 database 생성
- Docker·Testcontainers 도입
- 운영 배포와 secret manager 설정
- 애플리케이션 시작 시 migration 자동 적용
- schema sync 또는 `migration:fresh` 자동 실행
- 사용자·OTP·refresh session entity 및 migration
- seed 데이터와 범용 database abstraction

## 패키지

기존 패키지를 유지한다.

- `@mikro-orm/core@7.2.1`
- `@mikro-orm/nestjs@7.1.0`
- `@mikro-orm/postgresql@7.2.1`

아래 패키지를 추가한다.

- dependency: `@mikro-orm/migrations@7.2.1`
- dependency: `dotenv`
- devDependency: `@mikro-orm/cli@7.2.1`
- devDependency: `tsx`

`@mikro-orm/cli`와 `@mikro-orm/migrations`는 NestJS 연결 자체가 아니라 인증 계획에서 요구하는 migration CLI를 위해 사용한다. `tsx`는 CLI가 TypeScript 설정과 migration 파일을 직접 읽는 데 사용한다. `dotenv`는 NestJS를 부팅하지 않는 CLI 설정에서만 `environments/.env`를 읽는다. MikroORM core, PostgreSQL driver, migration과 CLI의 버전은 `7.2.1`로 맞춘다.

## 설정 구조

`src/database/mikro-orm.options.ts`는 database URL을 받아 공통 MikroORM 설정을 만드는 순수 함수로 둔다.

- PostgreSQL driver의 `clientUrl`에 전달받은 URL을 설정한다.
- compiled entity는 `dist/**/*.entity.js`, TypeScript entity는 `src/**/*.entity.ts`에서 찾는다.
- 인증 entity가 아직 없는 기반 단계에서는 `discovery.warnWhenNoEntities`를 비활성화한다.
- compiled migration은 `dist/database/migrations`, TypeScript migration은 `src/database/migrations`에서 찾는다.
- `Migrator` extension을 등록한다.

애플리케이션에서는 기존 `ConfigModule.forRoot({ envFilePath: 'environments/.env' })`를 유지한다. `MikroOrmModule.forRootAsync(...)`가 `ConfigService`를 주입받아 `DATABASE_URL`을 `getOrThrow()`로 읽고 공통 설정 함수에 전달한다. `autoLoadEntities: true`를 추가하여 feature module이 나중에 `forFeature(...)`로 등록한 entity를 런타임에 포함한다.

CLI는 `AppModule`을 부팅하지 않으므로 `ConfigModule`의 환경변수 로딩을 사용할 수 없다. `src/mikro-orm.config.ts`에서 `dotenv`로 `environments/.env`를 읽은 뒤 같은 공통 설정 함수를 호출한다. 이미 프로세스에 설정된 환경변수를 우선하며, `DATABASE_URL`이 없으면 명확한 오류를 발생시키고 secret 값은 로그에 출력하지 않는다.

NestJS MikroORM middleware가 요청별 EntityManager context를 관리하며 별도 repository layer는 만들지 않는다.

## Migration 정책

`src/database/migrations/`를 migration의 소유 경로로 사용한다. 이번 기반 작업에서는 인증 schema를 만들지 않는다.

Migration은 명시적인 CLI 명령으로만 실행한다. 애플리케이션 부팅 시 자동 실행하지 않아 잘못된 환경에서 schema가 변경되는 것을 방지한다.

주요 명령은 다음과 같다.

```bash
yarn mikro-orm debug
yarn mikro-orm migration:list
yarn mikro-orm migration:up
```

## Integration test

`test/jest-integration.json`은 `*.integration-spec.ts`만 실행한다. 기본 Jest 설정에서는 integration test를 제외하여 일반 단위 테스트가 DB에 의존하지 않게 한다. `package.json`에는 다음 스크립트를 추가한다.

```json
"test:integration": "jest --config ./test/jest-integration.json"
```

DB 기반 smoke test는 ORM을 실제 설정으로 초기화하고 PostgreSQL 연결 성공을 확인한 뒤 연결을 닫는다. 단위 테스트용 in-memory DB나 PostgreSQL mock은 도입하지 않는다.

후속 인증 integration test는 같은 설정을 사용하며 자신이 소유한 인증 테이블의 데이터만 초기화한다. 현재 `DATABASE_URL`은 이 초기화가 허용된 전용 DB를 가리킨다.

## 오류와 보안

- `DATABASE_URL` 원문은 source, test fixture, 로그에 기록하지 않는다.
- 접속 실패는 숨기지 않고 CLI와 integration test를 실패시킨다.
- destructive schema 명령은 자동화하지 않는다.
- migration 적용은 transaction 기본값을 유지한다.
- 애플리케이션 종료 시 MikroORM이 connection pool을 닫도록 NestJS lifecycle을 사용한다.

## 검증 기준

다음 명령이 모두 성공해야 기반 작업이 완료된다.

```bash
yarn build
yarn test --runInBand
yarn mikro-orm debug
yarn mikro-orm migration:list
yarn test:integration --listTests
yarn test:integration --runInBand
```

마지막으로 인증 구현 계획의 Task 0을 다시 실행한다. 네 MikroORM 패키지 확인, entity discovery, PostgreSQL 연결, migration 목록과 integration test discovery가 모두 성공하면 인증 Task 1로 진행할 수 있다.
