---
type: "query"
date: "2026-09-12T17:49:38.563712+00:00"
question: "[smart-order-consumer-app-PRD.md](docs/spec/smart-order-consumer-app-PRD.md) 파일을 기준으로 백엔드 개발을 시작하려고 하는데 어떤거부터 하면 좋을까?"
contributor: "graphify"
outcome: "useful"
source_nodes: ["Smart Order Consumer App", "Consumer Backend Scope", "Authentication API", "Store Discovery API", "Menu API", "Order API"]
---

# Q: [smart-order-consumer-app-PRD.md](docs/spec/smart-order-consumer-app-PRD.md) 파일을 기준으로 백엔드 개발을 시작하려고 하는데 어떤거부터 하면 좋을까?

## Answer

Expanded from original query via graph vocab: smart, order, consumer, catalog, menu, cart, checkout, payment, user, backend, api, database. 추천 순서는 API 방식과 DB 및 세션 정책 확정, 인증 수직 슬라이스 구현, 매장 및 메뉴 조회, 주문 생성 및 조회다. 현재 서버는 GraphQL 골격이고 DB가 없으며 SMS 서비스와 JWT, bcrypt 의존성은 이미 있다. 장바구니 서버 저장과 결제, 고급 위치 검색은 MVP에서 미룬다.

## Outcome

- Signal: useful

## Source Nodes

- Smart Order Consumer App
- Consumer Backend Scope
- Authentication API
- Store Discovery API
- Menu API
- Order API