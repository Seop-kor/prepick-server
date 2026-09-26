# Consumer 인증 API 설계

## 배경

Consumer App은 휴대폰 번호 기반 회원가입과 로그인, 로그인 상태 유지, 로그아웃, 현재 사용자 조회가 필요하다. PRD의 REST 경로와 HTTP method는 기능 목록으로만 참고하고, 현재 서버 구조에 맞춰 GraphQL API로 제공한다.

현재 프로젝트에는 PostgreSQL과 MikroORM이 아직 연결되어 있지 않다. 공통 DB 의존성, 연결 설정과 개발 환경 구성은 별도 선행 task에서 도입한다. 이 문서는 해당 기반 위에 구현할 인증 데이터 모델과 동작을 정의한다.

## 목표

- 한국 휴대폰 번호와 비밀번호로 가입하고 로그인한다.
- 회원가입 전에 SMS OTP로 휴대폰 번호를 확인한다.
- 회원가입 성공 시 별도 로그인 없이 토큰을 발급한다.
- 15분 access token과 최초 로그인 기준 30일 refresh token을 사용한다.
- refresh token을 회전하고 사용자당 활성 refresh session을 하나만 허용한다.
- 현재 로그인한 사용자를 `currentUser` Query로 조회한다.
- 비밀번호, OTP와 모든 토큰의 원문을 DB나 로그에 남기지 않는다.

## 제외 범위

- PostgreSQL·MikroORM 공통 설치와 연결 설정
- 운영 DB 생성과 배포 설정
- 소셜 로그인, 이메일 로그인, 비밀번호 재설정
- 다중 기기 동시 로그인과 전체 기기 로그아웃
- access token denylist 또는 즉시 강제 만료
- 역할·권한 관리
- 범용 repository interface와 인증 provider 추상화
- IP·전역 SMS rate limit 인프라

## 모듈 구조

### UsersModule

`UsersModule`은 사용자 데이터만 담당한다.

- `User` 엔티티 관리
- 휴대폰 번호 중복 확인
- 사용자 생성과 ID 기반 조회
- 인증된 사용자 정보를 반환하는 `currentUser` Query

비밀번호 필드는 GraphQL `User` 타입에 노출하지 않는다.

### AuthModule

`AuthModule`은 인증 흐름을 담당한다.

- OTP 발송과 검증
- 회원가입과 자동 로그인
- 로그인, token refresh, 로그아웃
- access token 발급과 검증
- `OtpChallenge`, `RefreshSession` 관리
- GraphQL 인증 guard와 `@Public()` metadata

`AuthModule`은 `UsersModule`을 통해서만 사용자를 조회하거나 생성한다. 의존 방향은 `AuthModule -> UsersModule` 단방향이다.

인증 guard는 전역으로 등록한다. `healthCheck`와 인증 Mutation에는 `@Public()`을 적용하고, `currentUser` 및 향후 매장·메뉴·주문 API는 기본적으로 인증을 요구한다.

## GraphQL 계약

### 공개 Mutation

```graphql
sendSignupOtp(phone: String!): OtpRequestPayload!
verifySignupOtp(phone: String!, code: String!): OtpVerificationPayload!
signUp(input: SignUpInput!): AuthPayload!
login(input: LoginInput!): AuthPayload!
refreshSession(refreshToken: String!): AuthPayload!
logout(refreshToken: String!): Boolean!
```

### 인증 필요 Query

```graphql
currentUser: User!
```

### 주요 입력과 응답

```graphql
input SignUpInput {
  name: String!
  password: String!
  verificationToken: String!
}

input LoginInput {
  phone: String!
  password: String!
}

type AuthPayload {
  user: User!
  accessToken: String!
  refreshToken: String!
  accessTokenExpiresAt: DateTime!
  refreshTokenExpiresAt: DateTime!
}

type OtpRequestPayload {
  expiresAt: DateTime!
  retryAfterSeconds: Int!
}

type OtpVerificationPayload {
  verificationToken: String!
  expiresAt: DateTime!
}

type User {
  id: ID!
  name: String!
  phone: String!
  createdAt: DateTime!
}
```

`signUp`은 전화번호를 별도로 받지 않는다. 서버가 `verificationToken`에 연결된 전화번호를 사용하여 OTP 확인 이후 전화번호가 바뀌는 것을 막는다.

`refreshSession`은 앱 재실행 시에도 사용할 수 있도록 새 토큰 쌍과 사용자를 함께 반환한다.

`logout`은 access token 없이 호출할 수 있으며, refresh token이 이미 만료되거나 삭제된 경우에도 `true`를 반환한다. 클라이언트는 결과와 관계없이 메모리의 access token과 OS 보안 저장소의 refresh token을 삭제한다.

> 인증 테이블의 현재 ID 스키마와 기존 UUID 데이터 전환 SQL은 [정수 ID 전환 설계](2026-09-25-auth-integer-ids-design.md)를 따른다.

## 데이터 모델

### User

```text
id
name
phone             UNIQUE
password
createdAt
updatedAt
```

`password`에는 bcrypt 결과만 저장하고 GraphQL 출력에서 제외한다.

### OtpChallenge

```text
id
phone
otp
expiresAt
attemptCount
verifiedAt                nullable
verificationToken         nullable
verificationExpiresAt     nullable
consumedAt                nullable
invalidatedAt             nullable
createdAt
```

- `otp`에는 서버 비밀값을 사용한 HMAC-SHA256 결과만 저장한다.
- `verificationToken`에는 SHA-256 결과만 저장한다.
- 새 OTP를 보내면 기존 활성 challenge를 무효화하고 새 행을 만든다.
- 최근 1시간의 발송 행을 집계하여 전화번호별 발송 한도를 적용한다.
- 만료된 이력의 장기 정리는 실제 데이터 증가가 문제가 될 때 추가한다.

### RefreshSession

```text
id
userId            UNIQUE
refreshToken
expiresAt
createdAt
updatedAt
```

- 사용자당 하나의 행만 허용한다.
- 실제 refresh token은 `sessionId.secret` 형태이며 `refreshToken`에는 secret의 SHA-256 결과만 저장한다.
- `sessionId`는 refresh session 조회에만 사용하고 access token에는 넣지 않는다.
- 로그인과 회원가입 시 기존 session을 삭제하고 새 session을 만든다.
- refresh 시 같은 session의 `refreshToken` 값만 원자적으로 교체한다.
- 만료 시각은 최초 로그인부터 30일이며 refresh할 때 연장하지 않는다.
- 로그아웃 시 session 행을 삭제한다.

필드명에는 저장 형식인 `Hash`를 붙이지 않지만, 비밀번호와 인증 비밀값의 원문은 저장하지 않는다.

## 인증 흐름

### OTP 요청

1. `sendSignupOtp`가 입력의 공백과 하이픈을 제거한다.
2. 결과가 `010`으로 시작하는 11자리 숫자인지 검증한다.
3. 이미 가입된 번호면 `PHONE_NUMBER_ALREADY_REGISTERED` 오류를 반환한다.
4. 60초 재전송 대기와 최근 1시간 최대 5회 정책을 확인한다.
5. 기존 활성 challenge를 무효화한다.
6. 암호학적으로 안전한 6자리 OTP를 생성하고 HMAC 결과만 저장한다.
7. 기존 `SmsService`로 OTP를 발송한다.

OTP는 5분 후 만료된다. 새 OTP가 발급되면 이전 코드는 즉시 사용할 수 없다.

SMS 호출이 실패하면 새 challenge를 무효화하고 오류를 반환한다. 외부 제공자가 실패 응답 전에 메시지를 처리했을 가능성이 있으므로 실패한 발송도 60초 재전송 대기와 시간당 발송 한도에는 포함한다.

### OTP 검증

1. 전화번호의 최신 활성 challenge를 조회한다.
2. 만료·무효화·소모 여부와 최대 5회 시도 제한을 확인한다.
3. 실패 시 `attemptCount`를 증가시킨다.
4. 성공 시 256-bit 무작위 `verificationToken`을 발급한다.
5. token의 SHA-256 결과와 10분 만료 시각을 저장하고 원문은 한 번만 응답한다.

### 회원가입과 자동 로그인

1. `verificationToken`을 해시하여 검증 완료된 challenge를 찾는다.
2. token이 유효하고 아직 소모되지 않았는지 확인한다.
3. challenge의 전화번호가 이미 가입됐는지 다시 확인한다.
4. UTF-8 기준 최대 72바이트인 비밀번호를 bcrypt cost 12로 처리한다.
5. 사용자 생성, verification token 소모, 기존 session 삭제와 새 session 생성을 한 트랜잭션에서 수행한다.
6. access token과 refresh token을 발급하여 사용자와 함께 반환한다.

### 로그인

1. 정규화한 전화번호로 사용자를 조회한다.
2. 사용자가 없거나 비밀번호가 다르면 같은 `UNAUTHENTICATED` 오류를 반환한다.
3. 기존 refresh session을 삭제하고 새 session을 만든다.
4. 새 토큰 쌍과 사용자를 반환한다.

### API 인증

클라이언트는 access token을 앱 메모리에 보관하고 모든 보호된 GraphQL 요청에 다음 헤더를 보낸다.

```text
Authorization: Bearer <accessToken>
```

access token에는 `sub`, `iat`, `exp`만 포함하며 15분 동안 유효하다. 서버는 JWT 서명과 만료를 검증하고 `sub`를 현재 사용자 ID로 사용한다. access token 검증 시 session DB를 조회하지 않는다.

GraphQL 응답의 `extensions.code`가 `UNAUTHENTICATED`이면 앱은 보안 저장소의 refresh token으로 `refreshSession`을 한 번 호출한다. 여러 요청이 동시에 실패하더라도 refresh는 하나만 실행하고 나머지는 결과를 기다린다. 성공하면 새 access token은 메모리에, 새 refresh token은 보안 저장소에 교체한 뒤 원래 요청을 한 번만 재시도한다.

### Token refresh

1. refresh token의 `sessionId`로 session을 조회한다.
2. secret의 SHA-256 결과, 절대 만료 시각과 session 상태를 확인한다.
3. 새 secret을 생성하고 조건부 갱신으로 저장된 값을 원자적으로 교체한다.
4. 새 access token과 refresh token, 기존 refresh 만료 시각 및 사용자를 반환한다.

회전 전에 사용된 refresh token은 다시 성공할 수 없다. refresh가 실패하면 앱은 모든 로컬 token을 삭제하고 로그인 화면으로 이동한다.

### 단일 기기 로그인

새 로그인은 기존 refresh session을 삭제하므로 이전 기기는 token을 갱신할 수 없다. access token은 stateless이므로 이전 기기에서 이미 발급된 token은 최대 15분 동안 유효할 수 있다. 즉시 강제 로그아웃을 위해 요청마다 DB를 조회하거나 denylist를 두는 방식은 이번 범위에서 사용하지 않는다.

## OTP 정책

- 코드: 숫자 6자리
- 유효시간: 5분
- 재전송 대기: 60초
- 코드당 검증 시도: 최대 5회
- 전화번호당 발송: 1시간에 최대 5회
- 새 코드 발급 시 이전 코드 무효화
- verification token: 10분, 일회용

전화번호별 제한만으로 여러 번호를 사용한 SMS 비용 공격까지 막을 수는 없다. 실제 외부 공개 배포 전에는 reverse proxy나 API gateway에서 IP·전역 rate limit을 별도로 적용한다.

## 입력 검증

- 전화번호: 공백과 하이픈을 제거한 뒤 `010XXXXXXXX` 형식
- OTP: 숫자 6자리
- 이름: 앞뒤 공백 제거 후 1~50자
- 비밀번호: 최소 8자, UTF-8 기준 최대 72바이트
- verification token과 refresh token: 예상한 구조와 길이가 아니면 즉시 거부

`class-validator`로 구조를 검증하고, UTF-8 바이트 길이와 token 구조처럼 기본 decorator로 표현하기 어려운 규칙만 서비스 경계에서 검사한다.

## 오류 계약

- `BAD_USER_INPUT`: 입력 형식 오류, 잘못되거나 만료된 OTP 또는 verification token
- `PHONE_NUMBER_ALREADY_REGISTERED`: 이미 가입된 전화번호
- `TOO_MANY_REQUESTS`: OTP 재전송 대기 또는 발송 한도 초과
- `UNAUTHENTICATED`: 잘못된 로그인 정보, 없거나 만료·폐기된 access/refresh token

클라이언트가 HTTP 상태 코드에 의존하지 않도록 GraphQL `extensions.code`에 위 값을 제공한다. 전화번호 미가입과 잘못된 비밀번호는 구분하지 않는다.

## 보안과 로깅

- 비밀번호는 bcrypt cost 12로 처리한다.
- OTP는 서버 비밀값을 사용한 HMAC-SHA256으로 저장한다.
- verification token과 refresh token secret은 SHA-256으로 저장한다.
- JWT signing secret과 OTP HMAC secret은 환경변수로 받고 시작 시 존재 여부를 검증한다.
- 전화번호, 비밀번호, OTP, SMS 본문과 모든 token 원문을 로그에 남기지 않는다.
- 기존 `ResponseLoggingPlugin`은 operation 이름, 결과와 처리 메타데이터만 기록한다.
- GraphQL 응답의 `User` 타입에는 `password`를 포함하지 않는다.
- 회원가입과 refresh 회전의 상태 변경은 transaction 또는 조건부 update로 원자성을 보장한다.

## 테스트 전략

### 단위 테스트

- 전화번호 정규화와 입력 검증
- OTP 생성, 만료, 재전송 대기, 시간당 발송 한도와 5회 시도 제한
- 새 OTP 발급 시 이전 challenge 무효화
- verification token 발급, 만료와 일회성 소비
- bcrypt cost 12 사용과 로그인 실패 응답 통일
- access/refresh token 발급, 회전, 절대 만료와 멱등 로그아웃
- 인증 guard의 공개 operation, 누락·변조·만료 access token 처리

시간 경계는 별도 Clock 추상화 없이 Jest fake timer로 검증한다. SMS 발송은 기존 `SmsService`를 대체하여 실제 메시지를 보내지 않는다.

### PostgreSQL 통합 테스트

- `User.phone` unique constraint
- `RefreshSession.userId` unique constraint
- 회원가입 transaction의 성공과 rollback
- 동시 refresh 요청 중 하나만 성공하는지 확인
- 새 로그인 시 이전 refresh session이 제거되는지 확인

### GraphQL E2E 테스트

- OTP 요청과 검증, 회원가입·자동 로그인, `currentUser`, refresh, logout 전체 흐름
- 보호된 Query의 access token 누락·만료 처리
- 이전 refresh token 재사용 거부
- 로그에 비밀번호, OTP, verification/access/refresh token이 포함되지 않음
- 기존 `healthCheck`가 인증 없이 유지됨

## 완료 조건

- 승인된 GraphQL operation과 오류 코드가 schema에 반영된다.
- OTP 정책과 일회용 verification token이 적용된다.
- 회원가입 후 자동 로그인되고 `currentUser`가 사용자를 반환한다.
- access token은 15분, refresh session은 절대 30일 만료를 따른다.
- refresh token이 매번 원자적으로 회전한다.
- 새 로그인 후 이전 기기는 refresh할 수 없다.
- 로그아웃이 session을 삭제하고 멱등적으로 동작한다.
- 인증 비밀값의 원문이 DB와 로그에 남지 않는다.
- unit, PostgreSQL integration, GraphQL E2E, build가 모두 통과한다.
- 코드 변경 후 `graphify update .`로 지식을 갱신한다.
