# 실행 검증 설정

verification 노드가 이 파일만 보고 서버를 띄우고 e2e를 실행한다. 노드는 스택을 모른다. 프로젝트가 명령을 적는다.
`<채우기>`가 남아 있으면 `doctor`가 경고한다. 해당하지 않는 섹션은 통째로 지운다.

## backend

- 서버 실행: `npm run start`
- 준비 확인: `curl -sf -X POST -H 'Content-Type: application/json' --data '{"query":"{ __typename }"}' http://localhost:6789/graphql`
- 준비 대기 한도(초): 60
- e2e 실행: `hurl --test --variable base=http://localhost:6789 hurl/*.hurl`
- e2e 시나리오 위치: `hurl/`
