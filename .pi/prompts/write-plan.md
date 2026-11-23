---
description: 설계 그래프 실행 (plan → plan-gate → write-jira)
argument-hint: "<slug | 티켓키> [만들려는 기능 설명]"
---
`/write-plan` 그래프를 실행한다.

먼저 `.pi/graph/RUNNER.md`를 읽고 그 규칙을 끝까지 지킨다.

인자: `$1`
추가 설명: ${@:2}

1. `.pi/graph/skills.json`이 없으면 `node .pi/graph/bin/graph.mjs doctor`를 실행한다. 스킬 누락이 있으면 사용자에게 알리고 멈춘다.
2. 인자가 티켓 키 형식(`ABC-123`)이면 기존 티켓의 재설계다:
   `node .pi/graph/bin/graph.mjs init write-plan --ticket $1`
   인자가 그 외 문자열이면 새 설계다. 소문자-하이픈 slug로 쓴다:
   `node .pi/graph/bin/graph.mjs init write-plan --slug $1`
   인자가 없으면 `ask_user_question`으로 slug를 받는다.
   이미 진행 중이라는 오류가 나오면 `init` 대신 `status write-plan <id>`로 이어서 진행한다.
3. RUNNER.md의 루프대로 `status`가 `running`이 아닐 때까지 진행한다.
4. 끝나면 티켓 키와 설계 문서 경로를 알려주고, 다음 단계로 `/graph-run <티켓키>`를 안내한다.
