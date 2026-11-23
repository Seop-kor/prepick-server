# verification-gate (게이트)

어떻게 개발됐는지 정리해서 보여주고 결정을 받는다.

## 보여줄 것

`data.verification.reportPath`를 읽고 정리한다.
- 무엇을 바꿨는지: TDD 노드의 `summary`와 `git diff --stat <vars.baseSha>`
- AC 판정 표 (충족/부분/미충족 개수와 항목)
- e2e 실행 결과
- 남아 있는 P2 리뷰 항목 수
- 리뷰 라운드 수와 자동 수정 사용 횟수

## 질문

`ask_user_question` 한 번, 질문 하나. 미충족이 없고 e2e가 통과했으면 `승인`을, 아니면 `반려 (구현)`을 첫 번째에 `(추천)`과 함께 둔다.
- `승인`: 커밋한다
- `반려 (구현)`: 구현을 고친다. 사유를 적는다
- `반려 (설계)`: 설계 자체가 틀렸다. `/write-plan`으로 돌아간다

## 완료

- `next graph-run <KEY> verification-gate approve`
- `next graph-run <KEY> verification-gate reject_impl --reason "<사유 그대로>"`
- `next graph-run <KEY> verification-gate reject_design --reason "<사유 그대로>"`
