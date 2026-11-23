# write-jira (작업)

승인된 설계 문서를 JIRA 티켓 하나로 만들거나, 재설계면 기존 티켓을 고친다.

## 준비

1. `.pi/graph/config.json`의 `jira`를 읽는다.
2. 도구 이름을 찾는다: `mcp({ search: "jira issue" })`.
   Atlassian Rovo MCP v2의 기본 도구는 `getAccessibleAtlassianResources`, `getVisibleJiraProjects`, `createJiraIssue`, `editJiraIssue`, `getJiraIssue`, `addCommentToJiraIssue` 등이다. 검색 결과에 없는 도구는 `discover`로 찾아서 `executeRead`/`executeWrite`로 실행한다.
3. `jira.cloudId`가 비었으면 `getAccessibleAtlassianResources`로 찾는다. 사이트가 여럿이면 `ask_user_question`으로 고르게 하고 config.json에 저장한다.
4. `jira.projectKey`가 비었으면 `getVisibleJiraProjects` 결과를 보여주고 `ask_user_question`으로 고르게 한 뒤 저장한다.
5. 인증 오류가 나면 사용자에게 `/mcp-auth atlassian`을 안내하고 멈춘다.

## 티켓 내용

설계 문서를 다시 쓰거나 요약하지 않고 그대로 옮긴다.
- **summary**: 문서 첫 줄 `# <기능 이름>`의 제목
- **description**: 첫 줄을 뺀 문서 본문 전체. 도구 스키마에 `contentFormat` 같은 markdown 옵션이 있으면 markdown으로 보낸다.
- description 맨 끝에 한 줄을 붙인다: `Source: <designPath> (<git rev-parse --short HEAD 또는 "uncommitted">)`
- **issuetype**: `jira.issueType` (기본 `Task`)

## 새 티켓 / 재설계

- `vars.replan`이 없으면 `createJiraIssue`로 만든다.
- `vars.replan`이 true이고 `vars.ticketKey`가 있으면 **새로 만들지 않는다.** `editJiraIssue`로 summary와 description을 바꾸고, `addCommentToJiraIssue`로 "설계 갱신: <feedback 사유>" 코멘트를 남긴다.

## 확인

`getJiraIssue`로 다시 읽어서 summary와 description이 들어갔는지 확인한다. 실패하면 1회 재시도하고, 그래도 안 되면 사용자에게 알리고 멈춘다.

## 완료

```
node .pi/graph/bin/graph.mjs next write-plan <id> write-jira done --data '{"ticketKey":"<KEY>"}'
```
