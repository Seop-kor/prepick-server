# jira-update (작업)

티켓에 결과를 남기고 상태를 옮긴다.

## 할 일

1. `write-jira.md`의 "준비" 단계로 도구와 cloudId를 준비한다.
2. `addCommentToJiraIssue`로 코멘트를 남긴다:
   ```
   구현 완료 — commit <data.commit.commitSha 앞 8자리>
   - 변경 요약: <TDD 노드 summary>
   - 검증: AC 충족 <n> / 부분 <n> / 미충족 <n>, e2e <통과/실패>
   - 리뷰: <reviewRound>라운드, 남은 P2 <n>개
   ```
3. 상태 전환: `getTransitionsForJiraIssue`로 가능한 전환을 읽는다.
   - `.pi/graph/config.json`의 `jira.doneTransition`과 이름이 같은 전환이 있으면 `transitionJiraIssue`로 실행한다.
   - 비어 있거나 맞는 전환이 없으면 `ask_user_question`으로 전환 목록에서 고르게 하고(`전환하지 않음` 포함), 고른 이름을 config.json에 저장한다.

## 완료

```
node .pi/graph/bin/graph.mjs next graph-run <KEY> jira-update done --data '{"transition":"<적용한 전환 또는 none>"}'
```
