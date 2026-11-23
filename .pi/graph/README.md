# pi 그래프 워크플로

두 개의 그래프로 기능을 설계하고 구현한다. 노드와 엣지는 `graph.json` 한 곳에만 정의되어 있고, `bin/graph.mjs` 엔진이 그 엣지로만 이동을 허용한다.

```
/write-plan <slug | 티켓키>
  plan ──done──▶ plan-gate ──approve──▶ write-jira ──done──▶ END
   ▲                 │
   └────reject───────┘

/graph-run <티켓키>
  read-jira ─▶ decide-mode-gate ─inline──▶ inline-tdd ──┐
                                └subagent─▶ subagent-tdd ┤ (testsPassed)
                                                         ▼
                                  ┌─ code-review ─┐
                                  └ secure-review ┘ (병렬 → 조인)
                                          ▼
                                   review-collect
                     P0+P1>0 & 자동수정<3 │  그 외
                  ◀──── $mode(자동) ──────┤
                                          ▼
                                     review-gate ─reject_impl──▶ $mode
                                          │      └reject_design─▶ @write-plan
                                       approve
                                          ▼
                       verification ─▶ verification-gate ─reject_impl──▶ $mode
                                          │               └reject_design─▶ @write-plan
                                       approve
                                          ▼
                                commit ─▶ jira-update ─▶ END
```

`$mode`는 decide-mode-gate에서 고른 TDD 노드다. `@write-plan`은 이 실행을 멈추고 `/write-plan <티켓키>`로 넘긴다.

## 파일

| 경로 | 역할 |
|---|---|
| `.pi/graph/graph.json` | 노드·엣지·조건 정의 |
| `.pi/graph/bin/graph.mjs` | 상태 전이 엔진 (`init`, `status`, `next`, `list`, `doctor`) |
| `.pi/graph/RUNNER.md` | 메인 세션이 따르는 공통 규칙 |
| `.pi/graph/nodes/*.md` | 노드별 지시문 |
| `.pi/graph/workflows/subagent-tdd.js` | subagent-tdd 노드의 pi-subagents 워크플로 스크립트 |
| `.pi/graph/config.json` | JIRA 설정, 모드 기준값, 테스트 명령 |
| `.pi/graph/verify.md` | 서버 실행 + e2e 명령 (프로젝트가 채움) |
| `.pi/graph/review-rules.md` | 사용자 리뷰 규칙 |
| `.pi/prompts/write-plan.md`, `graph-run.md` | `/write-plan`, `/graph-run` 명령 |
| `.pi/agents/*.md` | implementer, security-reviewer, adversarial-modeler |
| `docs/agents/issue-tracker.md` | mattpocock 스킬이 spec을 로컬 파일로 쓰게 하는 설정 |
| `.pi/graph/runs/` | 실행 상태와 산출물 (git 제외) |

## 설치

전제: pi에 pi-subagents, pi-mcp-adapter, rpiv-ask-user-question, mattpocock/skills, @dietrichgebert/ponytail이 설치되어 있다.

1. 이 폴더들(`.pi/`, `docs/agents/`)을 프로젝트 루트에 복사한다.
2. `bash .pi/graph/setup.sh` — trailofbits differential-review를 `~/.pi/agent/skills/`에 설치하고 `doctor`를 돌린다.
3. pi 안에서 `/mcp-auth atlassian`으로 로그인한다.
4. `.pi/graph/verify.md`의 `<채우기>`를 채운다.
5. pi에서 `/skill:setup-matt-pocock-skills`를 한 번 실행한다. 이슈 트래커 질문에는 "Other — `docs/agents/issue-tracker.md`에 이미 적혀 있음"으로 답한다. 이 단계에서 `AGENTS.md`(또는 `CLAUDE.md`)에 `## Agent skills` 블록과 `docs/agents/domain.md`가 생긴다.
6. pi를 재시작하거나 `/reload`한 뒤 `node .pi/graph/bin/graph.mjs doctor`가 모두 `ok`인지 확인한다.

## 사용

```
/write-plan login-session      # 설계 → 승인 → JIRA 티켓 생성
/graph-run ABC-123             # 구현 → 리뷰 → 검증 → 커밋 → JIRA 갱신
```

중간에 끊기면 같은 명령을 다시 실행한다. 진행 중인 실행이 있으면 이어서 한다.

## 엣지를 바꾸고 싶을 때

`graph.json`만 고친다. 예를 들어 자동 수정 횟수를 5회로 늘리려면 review-collect 엣지의 `{ "lt": ["vars.autoFix", 3] }`을 `5`로 바꾼다. 고친 뒤에는 `doctor`로 구조를 검사한다.

조건 문법: `eq`, `ne`, `gt`, `lt`, `gte`, `lte`, `all`, `any`. 값은 `data.<키>`(이번 노드가 넘긴 데이터) 또는 `vars.<키>`(실행 변수)로 참조한다.
