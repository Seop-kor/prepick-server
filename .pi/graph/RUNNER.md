# 그래프 실행 규칙 (모든 노드 공통)

이 문서는 `/write-plan`과 `/graph-run`을 실행하는 메인 세션이 따르는 규칙이다.

## 엔진만 경로를 정한다

- 다음 노드는 항상 `node .pi/graph/bin/graph.mjs`가 정한다. 직접 판단해서 노드를 건너뛰거나 순서를 바꾸지 않는다.
- `state.json`을 직접 고치지 않는다. 상태는 `next` 명령으로만 바꾼다.
- 엔진이 `ok: false`를 돌려주면 `error`를 읽고 원인(빠진 데이터, 잘못된 결과값, 빠진 사유)을 고친 뒤 다시 호출한다. 엔진을 우회하지 않는다.

## 루프

1. `status`(또는 `init`) 결과의 `current`에서 노드를 확인한다.
2. 그 노드의 `doc` 파일을 읽고 그대로 수행한다. `feedback`이 있으면 반드시 반영한다.
3. 노드가 끝나면 `next <graph> <id> <node> <outcome> [--reason "..."] [--data '{...}']`를 호출한다.
   - `outcome`은 `status`에 나온 `outcomes` 중 하나여야 한다.
   - `requires`에 나온 키는 `--data`에 모두 넣는다.
4. `status`가 `running`이 아니게 될 때까지 1번으로 돌아간다.
5. `done`이면 결과를 한 단락으로 요약한다. `handoff`면 `note`의 안내를 사용자에게 그대로 전한다.

`current`에 노드가 둘 이상이면(병렬 분기) 해당 노드 문서의 지시대로 함께 실행하고, 각 노드마다 `next`를 따로 호출한다.

## 게이트

- 게이트 노드는 반드시 `ask_user_question` 도구로 묻는다. 채팅 텍스트로 묻지 않는다.
- 첫 번째 선택지가 추천이면 라벨 끝에 `(추천)`을 붙인다.
- 반려를 고르면 사유를 받는다. 사용자가 `Type something.`이나 노트(`n`)로 사유를 적지 않았으면 한 번 더 묻는다. 사유 없이 `next`를 호출하면 엔진이 거부한다.
- 사용자의 답을 해석해서 다른 결과로 바꾸지 않는다.

## 파일 위치

- 실행 산출물: `status`의 `runDir` (예: `.pi/graph/runs/graph-run/ABC-12/`). git에 올리지 않는다.
- 설계 문서: `docs/features/<slug>/design.md`. git에 올린다.
- 스킬 경로: `.pi/graph/skills.json`. 없거나 비었으면 `node .pi/graph/bin/graph.mjs doctor`를 먼저 실행한다.
- 스킬은 `skills.json`에 적힌 `SKILL.md`를 read 도구로 읽어서 따른다. (mattpocock 스킬 일부는 `disable-model-invocation`이라 자동으로 뜨지 않는다.)

## codegraph

코드 탐색은 `.codegraph/`가 있으면 codegraph를 먼저 쓴다.
- 메인 세션: `codegraph_explore` MCP 도구가 있으면 그것을, 없으면 CLI를 쓴다.
- 서브에이전트: 항상 CLI(bash)를 쓴다. 포그라운드 자식은 메인의 확장·MCP 설정을 그대로 받지 않을 수 있다.

| 하고 싶은 것 | 명령 |
|---|---|
| 어떤 동작이 어떻게 이뤄지는지, A가 B에 어떻게 닿는지 | `codegraph explore "<질문>"` |
| 심볼 하나의 소스와 호출자 | `codegraph node "<심볼>"` |
| 누가 부르는지 / 무엇을 부르는지 | `codegraph callers "<심볼>"` / `codegraph callees "<심볼>"` |
| 바꾸면 영향받는 코드 | `codegraph impact "<심볼>"` |
| 바뀐 파일에 영향받는 테스트 | `git diff --name-only <base> \| codegraph affected --stdin --quiet` |

`.codegraph/`가 없거나 결과가 비면 grep/read로 대체한다. codegraph가 없다는 이유로 멈추지 않는다.

## 막혔을 때

- 노드 안에서 진행할 수 없는 결정이 생기면 `ask_user_question`으로 묻는다. 엣지를 임의로 만들지 않는다.
- MCP 호출이 실패하면 1회 재시도한다. 인증 오류면 사용자에게 `/mcp-auth atlassian`을 안내하고 멈춘다.
