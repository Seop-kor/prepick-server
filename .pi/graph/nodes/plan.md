# plan (작업)

사용자와 대화하며 설계를 확정하고 `docs/features/<slug>/design.md`를 만든다.

## 입력

- `vars.slug`: 문서 폴더 이름
- `vars.replan`, `vars.ticketKey`, `vars.designPath`: 재설계일 때만 있다
- `feedback`: plan-gate 반려 사유, 또는 graph-run에서 넘어온 설계 반려 사유

## 쓰는 스킬 (`.pi/graph/skills.json`의 경로를 read로 읽는다)

1. `grill-with-docs`: 이 스킬은 `grilling`과 `domain-modeling`을 부르라고만 적혀 있으니 두 SKILL.md를 모두 읽는다.
2. `to-spec`
3. 필요할 때만: `codebase-design`(모듈 경계·인터페이스가 쟁점일 때), `prototype`(상태 모델이나 UI가 불확실할 때), `research`(외부 API·라이브러리 사실 확인이 필요할 때)

## 스킬 동작 중 이 그래프에서 바꾸는 것

**질문은 `ask_user_question`으로 한다.** grilling은 원래 질문을 채팅에 번호를 붙여 출력한다. 이 노드에서는 각 라운드의 질문을 `ask_user_question`으로 보낸다.
- 한 번에 최대 4개까지다. 라운드에 질문이 5개 이상이면 나눠서 보낸다. 서로 의존하는 질문은 grilling 규칙대로 다음 라운드로 미룬다.
- 각 질문에 선택지 2~4개를 쓰고, 추천 답을 첫 번째에 `(추천)`과 함께 둔다.
- 사실(코드 구조, 기존 동작, 설정)은 사용자에게 묻지 않는다. codegraph(`explore`/`node`/`callers`, RUNNER.md 표 참고)로 먼저 찾고, 부족하면 grep/read나 `scout` 서브에이전트로 찾는다.

**to-spec의 저장 위치.** `docs/agents/issue-tracker.md` 설정대로 `docs/features/<slug>/design.md`에 저장한다. 이슈 트래커(JIRA)에 게시하지 않는다. 게시는 write-jira 노드가 한다.

**to-spec의 seam 확인(2단계)도 `ask_user_question`으로 한다.**

**to-spec 템플릿에 두 가지를 더한다.** 다음 노드들이 이 두 섹션을 기계적으로 읽는다.
- `## Implementation Decisions` 안에 `### Modules` 하위 섹션을 둔다. 만들거나 고칠 모듈 이름을 한 줄에 하나씩 `- <모듈>` 형식으로 적는다. 파일 경로는 적지 않는다.
- `## Acceptance Criteria` 섹션을 `## Out of Scope` 앞에 둔다. 사용자 스토리에서 검증 가능한 조건을 뽑아 `- [ ] AC-1: ...` 형식으로 번호를 붙인다.

문서 첫 줄은 `# <기능 이름>`으로 한다. write-jira가 이 줄을 티켓 제목으로 쓴다.

## 재설계일 때 (`vars.replan`이 true)

- 기존 `vars.designPath` 문서를 먼저 읽는다.
- `feedback`의 사유와 관련된 결정만 다시 grilling한다. 이미 확정된 나머지는 다시 묻지 않는다.
- 같은 파일을 고친다. 새 문서를 만들지 않는다.

## 반려 후 다시 왔을 때

`feedback`의 사유를 첫 라운드에서 다룬다. 사유가 어떤 결정을 바꾸는지 사용자에게 확인하고 문서를 고친다.

## 완료

```
node .pi/graph/bin/graph.mjs next write-plan <id> plan done --data '{"designPath":"docs/features/<slug>/design.md"}'
```
