# AC-12: 준비한 인증 변수와 fixture로 실제 GraphQL HTTP 응답을 검증한다.
# 실행: hurl --test --variable base=http://localhost:6789 --variable accessToken=<유효한_토큰> hurl/orders-statuses.hurl
# 외부 fixture: accessToken 전용 사용자에게 아래 주문만 준비하고, 다른 사용자의 주문 1007도 준비한다.
# 1001 CREATED     2026-01-01T00:00:00.000Z
# 1002 CONFIRMED   2026-01-02T00:00:00.000Z
# 1003 IN_PROGRESS 2026-01-03T00:00:00.000Z
# 1004 READY       2026-01-04T00:00:00.000Z
# 1005 PICKED_UP   2026-01-04T00:00:00.000Z (1004와 같은 시각)
# 1006 CANCELED    2026-01-05T00:00:00.000Z
# 1007 READY       2026-01-06T00:00:00.000Z (다른 사용자 소유)

# AC-2, AC-5, AC-11: 여러 상태를 OR로 조회하고 최신순 본인 주문만 반환한다.
POST {{base}}/graphql
Content-Type: application/json
Authorization: Bearer {{accessToken}}
{
  "query": "query { orders(size: 20, statuses: [CREATED, CONFIRMED, IN_PROGRESS, READY]) { items { id status createdAt } nextCursor } }"
}
HTTP 200
[Asserts]
jsonpath "$.errors" not exists
jsonpath "$.data.orders.items" count == 4
jsonpath "$.data.orders.items[0].id" == "1004"
jsonpath "$.data.orders.items[0].status" == "READY"
jsonpath "$.data.orders.items[0].createdAt" == "2026-01-04T00:00:00.000Z"
jsonpath "$.data.orders.items[1].id" == "1003"
jsonpath "$.data.orders.items[1].status" == "IN_PROGRESS"
jsonpath "$.data.orders.items[2].id" == "1002"
jsonpath "$.data.orders.items[2].status" == "CONFIRMED"
jsonpath "$.data.orders.items[3].id" == "1001"
jsonpath "$.data.orders.items[3].status" == "CREATED"
jsonpath "$.data.orders.items[*].id" not contains "1007"
jsonpath "$.data.orders.nextCursor" == null

# AC-3, AC-5: 완료·취소 상태도 같은 필터와 OrderPage 구조로 조회한다.
POST {{base}}/graphql
Content-Type: application/json
Authorization: Bearer {{accessToken}}
{
  "query": "query { orders(size: 20, statuses: [PICKED_UP, CANCELED]) { items { id status createdAt } nextCursor } }"
}
HTTP 200
[Asserts]
jsonpath "$.errors" not exists
jsonpath "$.data.orders.items" count == 2
jsonpath "$.data.orders.items[0].id" == "1006"
jsonpath "$.data.orders.items[0].status" == "CANCELED"
jsonpath "$.data.orders.items[1].id" == "1005"
jsonpath "$.data.orders.items[1].status" == "PICKED_UP"
jsonpath "$.data.orders.nextCursor" == null

# AC-4, AC-5: statuses 생략은 기존 전체 목록과 (createdAt, id) 최신순을 유지한다.
POST {{base}}/graphql
Content-Type: application/json
Authorization: Bearer {{accessToken}}
{
  "query": "query { orders(size: 20) { items { id status createdAt } nextCursor } }"
}
HTTP 200
[Asserts]
jsonpath "$.errors" not exists
jsonpath "$.data.orders.items" count == 6
jsonpath "$.data.orders.items[0].id" == "1006"
jsonpath "$.data.orders.items[1].id" == "1005"
jsonpath "$.data.orders.items[1].createdAt" == "2026-01-04T00:00:00.000Z"
jsonpath "$.data.orders.items[2].id" == "1004"
jsonpath "$.data.orders.items[2].createdAt" == "2026-01-04T00:00:00.000Z"
jsonpath "$.data.orders.items[3].id" == "1003"
jsonpath "$.data.orders.items[4].id" == "1002"
jsonpath "$.data.orders.items[5].id" == "1001"
jsonpath "$.data.orders.items[*].id" not contains "1007"
jsonpath "$.data.orders.nextCursor" == null

# AC-4: statuses null은 필터 생략과 같은 결과를 반환한다.
POST {{base}}/graphql
Content-Type: application/json
Authorization: Bearer {{accessToken}}
{
  "query": "query { orders(size: 20, statuses: null) { items { id status createdAt } nextCursor } }"
}
HTTP 200
[Asserts]
jsonpath "$.errors" not exists
jsonpath "$.data.orders.items" count == 6
jsonpath "$.data.orders.items[0].id" == "1006"
jsonpath "$.data.orders.items[1].id" == "1005"
jsonpath "$.data.orders.items[2].id" == "1004"
jsonpath "$.data.orders.items[3].id" == "1003"
jsonpath "$.data.orders.items[4].id" == "1002"
jsonpath "$.data.orders.items[5].id" == "1001"
jsonpath "$.data.orders.nextCursor" == null

# AC-4: 빈 statuses는 필터 생략과 같은 결과를 반환한다.
POST {{base}}/graphql
Content-Type: application/json
Authorization: Bearer {{accessToken}}
{
  "query": "query { orders(size: 20, statuses: []) { items { id status createdAt } nextCursor } }"
}
HTTP 200
[Asserts]
jsonpath "$.errors" not exists
jsonpath "$.data.orders.items" count == 6
jsonpath "$.data.orders.items[0].id" == "1006"
jsonpath "$.data.orders.items[1].id" == "1005"
jsonpath "$.data.orders.items[2].id" == "1004"
jsonpath "$.data.orders.items[3].id" == "1003"
jsonpath "$.data.orders.items[4].id" == "1002"
jsonpath "$.data.orders.items[5].id" == "1001"
jsonpath "$.data.orders.nextCursor" == null

# AC-5, AC-6: 필터된 첫 페이지는 size만큼 반환하고 다음 커서를 제공한다.
POST {{base}}/graphql
Content-Type: application/json
Authorization: Bearer {{accessToken}}
{
  "query": "query { orders(size: 2, statuses: [CREATED, CONFIRMED, IN_PROGRESS, READY]) { items { id status createdAt } nextCursor } }"
}
HTTP 200
[Captures]
active_cursor: jsonpath "$.data.orders.nextCursor"
[Asserts]
jsonpath "$.errors" not exists
jsonpath "$.data.orders.items" count == 2
jsonpath "$.data.orders.items[0].id" == "1004"
jsonpath "$.data.orders.items[1].id" == "1003"
jsonpath "$.data.orders.nextCursor" != null

# AC-6: 같은 필터의 다음 페이지는 첫 페이지와 중복 없이 나머지를 반환한다.
POST {{base}}/graphql
Content-Type: application/json
Authorization: Bearer {{accessToken}}
{
  "query": "query OrdersNext($cursor: String) { orders(size: 2, cursor: $cursor, statuses: [CREATED, CONFIRMED, IN_PROGRESS, READY]) { items { id status createdAt } nextCursor } }",
  "variables": { "cursor": "{{active_cursor}}" }
}
HTTP 200
[Asserts]
jsonpath "$.errors" not exists
jsonpath "$.data.orders.items" count == 2
jsonpath "$.data.orders.items[0].id" == "1002"
jsonpath "$.data.orders.items[1].id" == "1001"
jsonpath "$.data.orders.nextCursor" == null

# AC-7: 상태 순서와 중복이 달라도 같은 필터의 커서를 사용할 수 있다.
POST {{base}}/graphql
Content-Type: application/json
Authorization: Bearer {{accessToken}}
{
  "query": "query OrdersNormalizedNext($cursor: String) { orders(size: 2, cursor: $cursor, statuses: [READY, CREATED, CREATED, IN_PROGRESS, CONFIRMED, READY]) { items { id status createdAt } nextCursor } }",
  "variables": { "cursor": "{{active_cursor}}" }
}
HTTP 200
[Asserts]
jsonpath "$.errors" not exists
jsonpath "$.data.orders.items" count == 2
jsonpath "$.data.orders.items[0].id" == "1002"
jsonpath "$.data.orders.items[1].id" == "1001"
jsonpath "$.data.orders.nextCursor" == null

# AC-8: 다른 상태 집합에서 발급한 커서는 BAD_USER_INPUT으로 거부한다.
POST {{base}}/graphql
Content-Type: application/json
Authorization: Bearer {{accessToken}}
{
  "query": "query OrdersMismatchedFilter($cursor: String) { orders(size: 2, cursor: $cursor, statuses: [PICKED_UP, CANCELED]) { items { id } nextCursor } }",
  "variables": { "cursor": "{{active_cursor}}" }
}
HTTP 200
[Asserts]
jsonpath "$.errors" count == 1
jsonpath "$.errors[0].extensions.code" == "BAD_USER_INPUT"

# AC-8: 필터 있는 커서를 필터 없는 요청에 사용하면 BAD_USER_INPUT으로 거부한다.
POST {{base}}/graphql
Content-Type: application/json
Authorization: Bearer {{accessToken}}
{
  "query": "query OrdersRemovedFilter($cursor: String) { orders(size: 2, cursor: $cursor) { items { id } nextCursor } }",
  "variables": { "cursor": "{{active_cursor}}" }
}
HTTP 200
[Asserts]
jsonpath "$.errors" count == 1
jsonpath "$.errors[0].extensions.code" == "BAD_USER_INPUT"

# AC-9: 필터 없는 첫 페이지의 커서를 캡처한다.
POST {{base}}/graphql
Content-Type: application/json
Authorization: Bearer {{accessToken}}
{
  "query": "query { orders(size: 2) { items { id status createdAt } nextCursor } }"
}
HTTP 200
[Captures]
unfiltered_cursor: jsonpath "$.data.orders.nextCursor"
[Asserts]
jsonpath "$.errors" not exists
jsonpath "$.data.orders.items" count == 2
jsonpath "$.data.orders.items[0].id" == "1006"
jsonpath "$.data.orders.items[1].id" == "1005"
jsonpath "$.data.orders.nextCursor" != null

# AC-9: 기존 필터 없는 커서는 필터 없는 다음 페이지에서 계속 동작한다.
POST {{base}}/graphql
Content-Type: application/json
Authorization: Bearer {{accessToken}}
{
  "query": "query OrdersUnfilteredNext($cursor: String) { orders(size: 2, cursor: $cursor) { items { id status createdAt } nextCursor } }",
  "variables": { "cursor": "{{unfiltered_cursor}}" }
}
HTTP 200
[Asserts]
jsonpath "$.errors" not exists
jsonpath "$.data.orders.items" count == 2
jsonpath "$.data.orders.items[0].id" == "1004"
jsonpath "$.data.orders.items[1].id" == "1003"
jsonpath "$.data.orders.nextCursor" != null

# AC-8: 필터 없는 커서도 필터 있는 요청과 scope가 다르면 거부한다.
POST {{base}}/graphql
Content-Type: application/json
Authorization: Bearer {{accessToken}}
{
  "query": "query OrdersAddedFilter($cursor: String) { orders(size: 2, cursor: $cursor, statuses: [CREATED, CONFIRMED, IN_PROGRESS, READY]) { items { id } nextCursor } }",
  "variables": { "cursor": "{{unfiltered_cursor}}" }
}
HTTP 200
[Asserts]
jsonpath "$.errors" count == 1
jsonpath "$.errors[0].extensions.code" == "BAD_USER_INPUT"

# AC-10: 정의되지 않은 상태는 resolver 실행 전 GraphQL 검증 오류를 반환한다.
POST {{base}}/graphql
Content-Type: application/json
Authorization: Bearer {{accessToken}}
{
  "query": "query { orders(statuses: [NOT_A_STATUS]) { items { id } nextCursor } }"
}
HTTP 400
[Asserts]
jsonpath "$.errors" count == 1
jsonpath "$.errors[0].extensions.code" == "GRAPHQL_VALIDATION_FAILED"
jsonpath "$.errors[0].message" contains "Value \"NOT_A_STATUS\" does not exist in \"OrderStatus\" enum."
jsonpath "$.data" not exists
