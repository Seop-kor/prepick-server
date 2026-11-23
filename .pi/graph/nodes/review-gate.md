# review-gate (게이트)

정리된 리뷰를 보여주고 결정을 받는다.

## 보여줄 것

`data["review-collect"].reportPath`를 읽고 요약한다.
- P0/P1/P2 개수
- **P0/P1이 남아 있으면** 자동 수정 3회를 다 쓰고 왔다는 뜻이다. 남은 항목을 모두 보여주고 그 점을 분명히 말한다.
- P2 목록 (제목 한 줄씩)
- 지금까지의 리뷰 라운드 수(`vars.reviewRound`)

## 질문

`ask_user_question` 한 번, 질문 하나. P0/P1이 없으면 `승인`을, 남아 있으면 `반려 (구현)`을 첫 번째에 `(추천)`과 함께 둔다.
- `승인`: 검증 단계로 간다
- `반려 (구현)`: 구현을 고친다. 사유에 고칠 항목을 적는다. P2 중 고칠 것도 여기에 적는다
- `반려 (설계)`: 설계 자체가 틀렸다. `/write-plan`으로 돌아간다

## 완료

- `next graph-run <KEY> review-gate approve`
- `next graph-run <KEY> review-gate reject_impl --reason "<사유 그대로>"`
- `next graph-run <KEY> review-gate reject_design --reason "<사유 그대로>"`

`reject_impl`은 자동 수정 횟수를 0으로 되돌린다.
