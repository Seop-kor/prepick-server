# read-jira (작업)

티켓을 읽어 이 실행의 기준 스냅샷을 만든다. 이후 모든 노드는 JIRA가 아니라 이 스냅샷을 기준으로 삼는다.

## 할 일

1. `write-jira.md`의 "준비" 1~5단계로 도구와 cloudId를 준비한다.
2. `getJiraIssue`로 `vars.ticketKey`를 읽는다.
3. `<runDir>/ticket.md`에 저장한다. 첫 줄은 `# <KEY>: <summary>`, 그 아래에 description 원문을 그대로 둔다.
4. 스냅샷에서 두 가지를 뽑는다.
   - `### Modules` 아래의 `- <모듈>` 목록. 없으면 `ask_user_question`으로 알리고, 사용자가 원하면 `/write-plan <KEY>`로 설계를 보완하라고 안내한 뒤 멈춘다.
   - `## Acceptance Criteria`의 `AC-n` 항목. 없으면 위와 같이 처리한다.
5. `vars.dirtyAtStart`가 true면 시작 시점에 커밋되지 않은 변경이 있었다는 뜻이다. 이 변경은 리뷰 diff와 커밋에 섞인다. `ask_user_question`으로 `계속 진행` / `멈추고 정리하기`를 묻는다. 멈추면 `next`를 호출하지 않고 끝낸다.

## 완료

```
node .pi/graph/bin/graph.mjs next graph-run <KEY> read-jira done --data '{"snapshotPath":"<runDir>/ticket.md","modules":["<모듈1>","<모듈2>"]}'
```
