# PostgreSQL·MikroORM 기반 설계

## 배경

Consumer 인증 API는 PostgreSQL 트랜잭션, unique constraint, advisory lock과 pessimistic row lock을 사용한다. 프로젝트에는 PostgreSQL driver와 NestJS용 MikroORM 모듈이 설치되어 있고, `environments/.env`에 테스트 데이터를 초기화해도 되는 PostgreSQL의 `DATABASE_URL`이 설정되어 있다.

MikroORM은 애플리케이션의 데이터 접근에만 사용한다. 테이블 생성과 변경은 저장소 밖에서 데이터베이스 관리자가 수동으로 수행한다. Migration 도구, schema sync, SQL 파일은 사용하지 않는다.

## 목표

- NestJS 애플리케이션이 `DATABASE_URL`로 PostgreSQL에 연결한다.
- feature module이 `MikroOrmModule.forFeature(...)`로 등록한 entity를 자동으로 발견한다.
- HTTP·GraphQL 요청마다 분리된 EntityManager context를 사용한다.
- 실제 PostgreSQL을 사용하는 integration test를 별도 Jest 설정으로 실행한다.
- 애플리케이션 계정은 필요한 DML 권한만 사용하고 DDL 권한을 갖지 않는다.

## 제외 범위

- PostgreSQL 서버, database 및 table 생성
- Migration 또는 SQL 파일 관리
- MikroORM CLI와 schema generator
- Docker·Testcontainers 도입
- 운영 배포와 secret manager 설정
- 사용자·OTP·refresh session entity 및 인증 로직
- seed 데이터와 범용 database abstraction

## 패키지

다음 런타임 패키지만 사용한다.

- `@mikro-orm/core@7.2.1`
- `@mikro-orm/nestjs@7.1.0`
- `@mikro-orm/postgresql@7.2.1`

`@mikro-orm/migrations`, `@mikro-orm/cli`, CLI 전용 `dotenv`와 `tsx`는 사용하지 않는다.

## 설정 구조

`src/mikro-orm.options.ts`는 database URL을 받아 공통 MikroORM 설정을 만든다.

- PostgreSQL driver에 전달받은 URL을 그대로 설정한다.
- compiled entity는 `dist/**/*.entity.js`, TypeScript entity는 `src/**/*.entity.ts`에서 찾는다.
- 인증 entity가 아직 없는 기반 단계에서는 `discovery.warnWhenNoEntities`를 비활성화한다.
- Migration extension과 경로는 설정하지 않는다.

애플리케이션은 `ConfigModule.forRoot({ envFilePath: 'environments/.env' })`로 환경변수를 읽는다. `MikroOrmModule.forRootAsync(...)`가 `ConfigService`에서 `DATABASE_URL`을 읽어 공통 설정 함수에 전달한다. `autoLoadEntities: true`로 feature module에서 등록한 entity를 런타임에 포함한다.

NestJS MikroORM middleware가 요청별 EntityManager context를 관리하며 별도 repository abstraction은 만들지 않는다.

## 테이블 관리 정책

- 데이터베이스 관리자가 저장소 밖에서 테이블과 제약조건을 수동으로 생성·변경한다.
- 애플리케이션은 table 생성, schema sync 또는 migration을 실행하지 않는다.
- 개발과 테스트를 시작하기 전에 필요한 테이블이 대상 DB에 준비되어 있어야 한다.
- 애플리케이션 DB 계정에는 필요한 `SELECT`, `INSERT`, `UPDATE`, `DELETE` 권한만 부여하고 DDL 권한은 부여하지 않는다.

## Integration test

`test/jest-integration.json`은 `*.integration-spec.ts`만 실행한다. 기본 Jest 설정에서는 integration test를 제외하여 일반 단위 테스트가 DB에 의존하지 않게 한다.

DB smoke test는 `AppModule`을 구성하여 PostgreSQL `EntityManager`가 주입되는지 확인한다. 후속 인증 integration test는 관리자가 미리 생성한 인증 테이블을 사용하며 자신이 소유한 테스트 데이터만 초기화한다.

## 오류와 보안

- `DATABASE_URL` 원문은 source, test fixture, 로그에 기록하지 않는다.
- 접속 실패를 숨기지 않고 integration test를 실패시킨다.
- 애플리케이션 프로세스에는 DDL 권한을 부여하지 않는다.
- 애플리케이션 종료 시 MikroORM이 connection pool을 닫도록 NestJS lifecycle을 사용한다.

## 검증 기준

```bash
yarn build
yarn test --runInBand
yarn test:integration --listTests
yarn test:integration --runInBand
```

인증 기능을 구현하기 전에 대상 데이터베이스에 필요한 테이블과 제약조건이 수동으로 준비되었는지 별도로 확인한다.
