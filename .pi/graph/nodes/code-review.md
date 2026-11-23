# code-review (작업, secure-review와 병렬)

mattpocock `code-review` 스킬로 Standards 축과 Spec 축 리뷰를 한다. **secure-review와 같은 병렬 호출로 함께 띄운다.** 메인 세션이 둘 다 조율한다.

## 리뷰 대상 (이 그래프는 중간 커밋을 하지 않는다)

변경은 아직 커밋되지 않은 상태다. 그래서 code-review 스킬의 `git diff <fixed-point>...HEAD` 대신 아래 명령을 쓴다.

```
git diff <vars.baseSha>                                 # base 이후 변경(작업 트리 포함)
git diff --stat <vars.baseSha>
git ls-files --others --exclude-standard -- . ':(exclude).pi/graph/runs'   # 새로 만든 파일
```

새 파일은 diff에 나오지 않는다. 목록을 리뷰어에게 주고 직접 읽게 한다.

## code-review 스킬을 쓸 때 바꾸는 것

`skills.json`의 `code-review` SKILL.md를 읽고 그 절차를 따르되, 다음을 정해준다.
- **1단계(fixed point)**: `vars.baseSha`. 사용자에게 묻지 않는다. 위의 diff 명령을 쓴다.
- **2단계(spec 출처)**: `vars.snapshotPath`(티켓 스냅샷). 다른 곳을 찾지 않는다.
- **3단계(standards 출처)**: 저장소에서 찾은 문서들과 `.pi/graph/review-rules.md`를 함께 넣는다. review-rules.md는 사용자가 정한 규칙이고, 저장소 문서와 충돌하면 review-rules.md가 우선한다.
- **4단계(병렬 실행)**: Standards 리뷰어와 Spec 리뷰어(`reviewer` 에이전트)를 띄우는 같은 `subagent` 병렬 호출에 **secure-review 작업도 넣는다** (`nodes/secure-review.md` 참고). 세 작업이 한 번에 병렬로 돈다.
- **리뷰어에게 줄 도구 안내**: `.codegraph/`가 있으면 diff 밖 영향(바뀐 심볼의 호출자)을 `codegraph callers`/`codegraph impact`로 확인하라고 적는다.
- **피드백 라운드**: 직전 `review-<n-1>.md`가 있으면 Spec과 Standards 리뷰어에게 함께 주고, 이전 P0/P1이 해결됐는지도 확인하게 한다.

## 산출물

- `<runDir>/review-<vars.reviewRound>-code.md`: 스킬 5단계 형식 그대로 `## Standards`와 `## Spec`, 마지막 요약 줄
- 순위를 다시 매기거나 합치지 않는다. 합치기는 review-collect가 한다.

## 완료

secure-review 결과도 받은 뒤, 노드마다 따로 호출한다.

```
node .pi/graph/bin/graph.mjs next graph-run <KEY> code-review done --data '{"reportPath":"<runDir>/review-<n>-code.md"}'
node .pi/graph/bin/graph.mjs next graph-run <KEY> secure-review done --data '{"reportPath":"<runDir>/review-<n>-security.md"}'
```

두 번째 호출 뒤에 엔진이 review-collect로 합류시킨다.
