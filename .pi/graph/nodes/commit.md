# commit (작업)

이번 실행의 변경을 커밋 하나로 만든다. push하지 않는다.

## 올릴 파일

```
git diff --name-only <vars.baseSha>
git ls-files --others --exclude-standard -- . ':(exclude).pi/graph/runs'
```

- 이 목록만 `git add`한다. `git add -A`나 `git add .`는 쓰지 않는다.
- `vars.dirtyAtStart`가 true였으면, 시작 전부터 바뀌어 있던 파일이 섞였을 수 있다. 목록을 보여주고 `ask_user_question`으로 뺄 파일을 묻는다.
- 비밀값(`.env`, 키 파일 등)으로 보이는 파일이 있으면 올리지 않고 사용자에게 알린다.

## 커밋 메시지

저장소에 규칙이 있으면 그것을 따른다 (commitlint 설정, CONTRIBUTING.md, 최근 `git log --oneline -20`의 형식). 없으면 다음 형식을 쓴다.

```
<type>(<scope>): <한 줄 요약> [<KEY>]

<무엇을 왜 바꿨는지 2~4줄>

Refs: <KEY>
Design: <vars.designPath 또는 스냅샷 경로>
```

`type`은 feat/fix/refactor 등에서 고르고, `scope`는 주된 모듈 이름으로 한다.

## 완료

커밋 뒤 `git rev-parse HEAD`로 SHA를 확인한다.

```
node .pi/graph/bin/graph.mjs next graph-run <KEY> commit done --data '{"commitSha":"<sha>"}'
```
