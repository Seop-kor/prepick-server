# inline-tdd (작업)

메인 세션에서 직접 TDD로 구현한다.

## 할 일

1. `nodes/_tdd-common.md`를 읽고 따른다.
2. `skills.json`에서 `tdd`, `ponytail`(필요하면 `codebase-design`) SKILL.md를 읽는다.
3. 티켓 스냅샷과 `feedback`을 읽는다.
4. `vars.modules` 순서대로 seam마다 red → green 사이클을 돈다.
5. 마지막에 **전체 테스트 스위트를 실제로 실행한다.**
   - 명령: `.pi/graph/config.json`의 `testCommand`. 비어 있으면 프로젝트에서 찾는다(`package.json`의 `scripts.test` 등). 찾은 명령은 config.json에 저장해 둔다.
   - 출력과 종료 코드를 직접 확인한다. 실행하지 않고 통과했다고 판단하지 않는다.

## 테스트가 계속 실패할 때

원인이 구현 밖(설계 모순, 환경 문제)에 있으면 `ask_user_question`으로 상황을 설명하고 `계속 시도` / `멈춤`을 묻는다. 멈추면 `next`를 호출하지 않는다. 통과하지 않은 상태로 `testsPassed: true`를 보내지 않는다.

## 완료

```
node .pi/graph/bin/graph.mjs next graph-run <KEY> inline-tdd done --data '{"testsPassed":true,"testCommand":"<명령>","summary":"<무엇을 바꿨는지 2~3줄>"}'
```

`testsPassed`가 true가 아니면 엔진이 다음 노드로 보내지 않는다.
