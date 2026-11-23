# TDD 공통 규칙 (inline-tdd, subagent-tdd, implementer 에이전트가 함께 따른다)

## 스킬

- `tdd`: red → green 루프의 규칙
- `ponytail`: 가장 작은 변경으로 해결하고, 검증·에러 처리·보안·접근성은 줄이지 않는다
- `codebase-design`: tdd가 모듈 경계나 seam을 판단해야 할 때 참고한다

## 기준

- 무엇을 만들지는 티켓 스냅샷(`vars.snapshotPath`)이 기준이다.
- **seam은 이미 합의되어 있다.** 스냅샷의 `## Testing Decisions`에 적힌 seam에서만 테스트한다. tdd 스킬은 seam을 사용자에게 확인하라고 하지만, 이 그래프에서는 plan 노드(to-spec)에서 이미 확인했으므로 다시 묻지 않는다. 적힌 seam으로는 테스트가 불가능할 때만 묻는다.
- tdd 스킬 규칙대로 리팩터링은 루프에 넣지 않는다. 리뷰 노드가 다룬다.

## e2e 시나리오

`.pi/graph/verify.md`에 적힌 e2e 위치(Playwright spec 또는 `.hurl` 파일 폴더)에, 사용자가 확인할 수 있는 동작에 해당하는 AC마다 시나리오를 추가하거나 고친다. 시나리오 이름이나 주석에 `AC-n`을 남긴다. verification 노드가 이 표시로 AC와 시나리오를 짝짓는다.

## 코드 탐색

파일을 고치기 전에 codegraph로 영향 범위를 본다: `codegraph impact "<심볼>"`, `codegraph callers "<심볼>"`. 그래프가 없으면 grep으로 대체한다.

루프 중간에는 `git diff --name-only <vars.baseSha> | codegraph affected --stdin --quiet`로 영향받는 테스트 파일만 골라 돌려도 된다. 끝날 때의 전체 테스트 실행은 생략하지 않는다.

## 피드백 반영 (다시 돌아왔을 때)

- `feedback` 항목의 출처가 review-collect면 해당 보고서(`review-<n>.md`)의 **P0/P1 항목만** 고친다. P2는 건드리지 않는다.
- 출처가 게이트(review-gate, verification-gate)면 사용자가 적은 사유를 고친다.
- 고칠 수 있는 항목은 먼저 그 문제를 재현하는 실패 테스트를 쓰고 고친다.
- 피드백에 없는 범위로 넓히지 않는다.

## 하지 않는 것

- 커밋하지 않는다. 커밋은 commit 노드가 한다.
- `.pi/graph/runs/` 아래 파일과 `state.json`을 고치지 않는다.
- 새 의존성을 추가해야 하면 먼저 묻는다.
