# secure-review (작업, code-review와 병렬)

trailofbits `differential-review` 스킬로 보안 관점의 diff 리뷰를 한다. 직접 실행하지 않고 `security-reviewer` 에이전트에게 맡긴다. code-review의 4단계 병렬 호출에 함께 넣는다.

## security-reviewer에게 줄 작업

아래를 채워서 `task`로 준다.

```
differential-review 스킬로 보안 리뷰를 한다.
- 기준: git diff <vars.baseSha> (커밋되지 않은 작업 트리 변경 포함)
- 새 파일: <git ls-files --others --exclude-standard 결과>
- 티켓 스냅샷(의도 파악용): <vars.snapshotPath>
- 보고서 저장 경로: <runDir>/review-<vars.reviewRound>-security.md
- 이전 보안 보고서: <runDir>/review-<n-1>-security.md (있을 때만)
```

## 결과 형식

에이전트에 `outputSchema`를 준다. 보고서와 별개로 이 값으로 개수를 확인한다.

```json
{
  "type": "object",
  "properties": {
    "reportPath": { "type": "string" },
    "overallRisk": { "enum": ["CRITICAL", "HIGH", "MEDIUM", "LOW"] },
    "counts": {
      "type": "object",
      "properties": {
        "critical": { "type": "integer" }, "high": { "type": "integer" },
        "medium": { "type": "integer" }, "low": { "type": "integer" }
      },
      "required": ["critical", "high", "medium", "low"]
    },
    "coverageLimits": { "type": "string" }
  },
  "required": ["reportPath", "overallRisk", "counts"]
}
```

## 완료

`code-review.md`의 "완료"에 있는 두 번째 명령으로 처리한다.
