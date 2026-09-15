---
type: "query"
date: "2026-09-14T14:19:28.321537+00:00"
question: "graphql은 유지하고 PostgreSQL과 MikroORM을 사용할 때 Access Token과 Refresh Session은 어떤 방식을 추천하는가?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["Authentication API", "@nestjs/jwt", "Phone Number Account Identity", "Six-Digit OTP Verification", "Consumer Backend Scope"]
---

# Q: graphql은 유지하고 PostgreSQL과 MikroORM을 사용할 때 Access Token과 Refresh Session은 어떤 방식을 추천하는가?

## Answer

Expanded from original query via graph vocab: graphql, authentication, jwt, refresh, token, session, user, database, api. MikroORM을 유지한다. NestJS 공식 통합과 요청별 EntityManager, Unit of Work가 주문 트랜잭션에 적합하다. 인증은 15분 HS256 JWT access token과 30일 절대 만료 opaque refresh token을 사용한다. refresh token은 sessionId와 256-bit secret 조합으로 발급하고 SHA-256 hash만 Session에 저장하며 사용할 때마다 원자적으로 회전한다. 재사용 감지 시 해당 session을 revoke한다. 모바일은 access token을 메모리, refresh token을 OS secure storage에 보관한다. 현재 request 및 response body 전역 로깅은 인증 정보 유출 위험이 있어 인증 구현 전에 제거하거나 redaction해야 한다.

## Outcome

- Signal: useful

## Source Nodes

- Authentication API
- @nestjs/jwt
- Phone Number Account Identity
- Six-Digit OTP Verification
- Consumer Backend Scope