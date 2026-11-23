---
description: 구현 그래프 실행 (read-jira → TDD → 리뷰 → 검증 → 커밋 → JIRA 갱신)
argument-hint: "<티켓키>"
---
`/graph-run` 그래프를 티켓 `$1`에 대해 실행한다.

먼저 `.pi/graph/RUNNER.md`를 읽고 그 규칙을 끝까지 지킨다.

1. 인자가 없으면 `ask_user_question`으로 티켓 키를 받는다.
2. `.pi/graph/skills.json`이 없으면 `node .pi/graph/bin/graph.mjs doctor`를 실행한다. 스킬 누락이 있으면 사용자에게 알리고 멈춘다.
3. `node .pi/graph/bin/graph.mjs init graph-run --ticket $1`
   이미 진행 중이라는 오류가 나오면 `status graph-run $1`로 이어서 진행한다.
4. RUNNER.md의 루프대로 `status`가 `running`이 아닐 때까지 진행한다.
5. 리뷰 결과 때문에 엔진이 TDD 노드로 자동으로 되돌리면(P0/P1 자동 수정), 사용자에게 "자동 수정 N/3회차"라고 한 줄만 알리고 계속 진행한다.
6. 끝나면 커밋 SHA, JIRA 갱신 결과, 남은 P2 항목을 짧게 요약한다.
