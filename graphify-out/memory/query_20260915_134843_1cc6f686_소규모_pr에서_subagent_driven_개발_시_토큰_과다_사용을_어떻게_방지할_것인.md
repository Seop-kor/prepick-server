---
type: "query"
date: "2026-09-15T13:48:43.839250+00:00"
question: "소규모 PR에서 subagent-driven 개발 시 토큰 과다 사용을 어떻게 방지할 것인가?"
contributor: "graphify"
outcome: "useful"
---

# Q: 소규모 PR에서 subagent-driven 개발 시 토큰 과다 사용을 어떻게 방지할 것인가?

## Answer

이번 PR은 실제 코드 변경량보다 실행 절차 때문에 약 3,090만 토큰을 처리했다. 이 중 약 95.6%는 반복 컨텍스트에 대한 캐시 입력이었고, 메인 세션이 58.9%, 최종 수정 에이전트가 20.3%를 차지했다. 원인은 총 17개 세션의 구현·리뷰·재리뷰 반복, 긴 계획 및 지침의 재주입, 최대 약 1.5MB인 graphify-out 생성물을 리뷰 컨텍스트에 포함한 것, 실패한 에이전트 재시도였다. 앞으로 graphify-out 및 기타 생성물을 리뷰 입력에서 제외하고 중간 토큰 사용량을 점검한다.

## Outcome

- Signal: useful
