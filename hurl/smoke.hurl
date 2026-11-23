# 서버와 GraphQL 엔드포인트가 정상 동작하는지 확인한다.
POST {{base}}/graphql
Content-Type: application/json
{
  "query": "{ __typename }"
}
HTTP 200
[Asserts]
jsonpath "$.data.__typename" == "Query"
