# decide-mode-gate (게이트)

티켓이 건드리는 모듈 수로 inline-tdd와 subagent-tdd 중 하나를 고르게 한다.

## 추천 기준

- 모듈 수 `n` = `vars.modules`의 길이
- 기준값 `k` = `.pi/graph/config.json`의 `mode.subagentMinModules` (기본 3)
- `n >= k`이면 subagent-tdd를, 아니면 inline-tdd를 추천한다.

참고 정보: codegraph가 있으면 모듈마다 `codegraph explore "<모듈>"`로 관련 심볼과 호출 경로를 훑어 영향 범위를 함께 보여준다. 추천은 모듈 수로만 정한다.

## 질문

`ask_user_question` 한 번. 추천하는 쪽을 첫 번째에 `(추천)`과 함께 둔다.
- `inline-tdd`: 메인 세션에서 직접 구현. 컨텍스트 하나로 끝나서 저렴하다. 모듈이 많으면 뒤쪽 작업이 압축된 컨텍스트에서 진행된다.
- `subagent-tdd`: 모듈마다 새 컨텍스트의 implementer를 띄운다. 모듈별로 깨끗한 컨텍스트에서 진행되지만 그만큼 비용이 든다.

설명에 `모듈 n개: a, b, c` 정보를 넣는다.

## 완료

- `next graph-run <KEY> decide-mode-gate inline`
- `next graph-run <KEY> decide-mode-gate subagent`

선택한 모드는 `vars.mode`에 저장되고, 이후 반려 루프는 같은 모드로 돌아온다.
