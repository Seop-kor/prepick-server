# plan-gate (게이트)

plan에서 만든 설계를 보여주고 승인 또는 반려를 받는다.

## 보여줄 것

`vars.designPath` 문서를 읽고 채팅에 짧게 요약한다.
- 문제와 해결책 (각 1~2문장)
- `### Modules` 목록
- Acceptance Criteria 개수와 각 항목 제목
- Out of Scope
- 문서 경로

## 질문

`ask_user_question` 한 번, 질문 하나:
- `승인`: 이 설계로 JIRA 티켓을 만든다
- `반려`: 사유를 적어주세요 (`Type something.` 또는 노트)

설계 요약을 첫 선택지의 `preview`에 넣어도 된다.

## 완료

- 승인: `next write-plan <id> plan-gate approve`
- 반려: `next write-plan <id> plan-gate reject --reason "<사용자가 적은 사유 그대로>"`
