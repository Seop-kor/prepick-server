# subagent-tdd (작업)

티켓을 모듈 단위 작업으로 나누고, 모듈마다 새 컨텍스트의 `implementer`를 띄워 TDD로 구현한다. 메인 세션은 나누기, 순서 정하기, 결정 중계, 최종 테스트만 한다.

## 1. 작업 나누기

- 모듈 하나가 작업 하나다. JIRA 티켓은 늘리지 않는다.
- 순서: codegraph로 모듈 간 의존 방향을 확인해서(모듈의 주요 심볼에 `codegraph callers`/`codegraph callees`, 또는 `codegraph explore "how does <A> use <B>"`), 다른 모듈이 의존하는 모듈을 먼저 한다. 그래프가 없으면 스냅샷 `### Modules`의 순서를 따른다.
- 피드백으로 다시 왔으면 피드백 항목이 가리키는 모듈만 작업으로 만든다.
- 작업마다 짧은 지시(`brief`)를 쓴다: 이 모듈이 맡는 AC 번호, 해당 seam, 피드백 항목. 스냅샷 내용을 복사하지 말고 경로와 번호로 가리킨다.

## 2. 실행

워크플로 스크립트로 순서대로 실행한다. 한 번에 한 implementer만 작업 트리에 쓴다.

```js
subagent({
  workflow: ".pi/graph/workflows/subagent-tdd.js",
  async: true,
  args: {
    snapshotPath: "<vars.snapshotPath>",
    runDir: "<runDir>",
    feedbackPath: "<피드백 보고서 경로 또는 빈 문자열>",
    feedbackText: "<게이트 반려 사유 또는 빈 문자열>",
    tasks: [ { key: "m1-auth", module: "auth", brief: "AC-1, AC-3 / seam: AuthService.login" } ]
  }
})
```

- 실행 중에 implementer가 `contact_supervisor`로 결정을 요청하면, `ask_user_question`으로 사용자에게 묻고 `subagent_supervisor({ action: "reply", ... })`로 답을 돌려준다. 메인이 대신 정하지 않는다.
- 완료될 때까지 기다린다(`bg_wait` 또는 완료 알림).

## 3. 결과 확인

- 스크립트 결과의 `results[].status`가 모두 `done`인지 본다.
- `blocked`가 있으면 그 이유를 사용자에게 `ask_user_question`으로 전하고, 답을 반영해 그 작업부터 다시 실행한다.
- implementer의 보고를 그대로 믿지 않는다. 메인이 **전체 테스트 스위트를 직접 실행한다** (`inline-tdd.md` 5번과 같은 방법).

## 완료

```
node .pi/graph/bin/graph.mjs next graph-run <KEY> subagent-tdd done --data '{"testsPassed":true,"testCommand":"<명령>","summary":"<모듈별 변경 요약>"}'
```
