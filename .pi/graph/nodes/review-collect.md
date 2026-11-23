# review-collect (작업)

두 리뷰 보고서를 한 기준(P0/P1/P2)으로 합친다. 다음 경로는 엔진이 정한다.
- P0+P1이 1개 이상이고 자동 수정이 3회 미만이면 TDD 노드로 자동 복귀
- 그 외에는 review-gate

## 입력

- `data["code-review"].reportPath`: Standards/Spec 보고서
- `data["secure-review"].reportPath`: 보안 보고서

## 등급 매핑

| 등급 | 뜻 | 포함하는 것 |
|---|---|---|
| **P0** | 머지를 막는다 | 보안 CRITICAL / Spec: 요구사항 누락·부분 구현, 구현은 됐지만 동작이 틀림 / 데이터 손실·깨짐 |
| **P1** | 릴리스 전에 고친다 | 보안 HIGH / Standards: 문서화된 규칙(review-rules.md 포함)의 명확한 위반 / Spec: 요청하지 않은 동작 추가(scope creep) |
| **P2** | 보고만 한다 | 보안 MEDIUM·LOW / Standards: 코드 스멜 등 판단의 영역(judgement call) |

애매하면 더 낮은 등급으로 두되 이유를 한 줄 적는다. 근거(파일:줄, 인용, 재현) 없는 항목은 P2로 내린다.

## 합치기 규칙

- 같은 위치의 같은 문제는 하나로 합치고 출처를 함께 적는다 (예: `spec+security`).
- 원래 보고서의 근거를 없애지 않는다. 각 항목에 원본 보고서 경로와 절을 남긴다.

## 산출물: `<runDir>/review-<vars.reviewRound>.md`

```
# Review round <n> — <KEY>
요약: P0 <a> · P1 <b> · P2 <c> (자동 수정 <vars.autoFix>/3회 사용)

## P0
- [P0-1] <제목> — <파일:줄> (출처: spec)
  문제: ... / 고치는 방법: ... / 근거: <원본 보고서#절>

## P1
...
## P2
...
```

## 완료

```
node .pi/graph/bin/graph.mjs next graph-run <KEY> review-collect done --data '{"p0":<a>,"p1":<b>,"p2":<c>,"reportPath":"<runDir>/review-<n>.md"}'
```

엔진이 TDD 노드로 보내면 사용자에게 "자동 수정 <vars.autoFix>/3회차: P0 a개, P1 b개"라고 한 줄만 알린다.
