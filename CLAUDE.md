## 테스트 파일 작성 시 유의사항 (중요)
Rules:
- 테스트 파일 작성 가독성을 위해 `~ 하면 ~ 한다`로 작성

## Agent skills

### Issue tracker

스펙은 로컬에 작성하고, 승인 후 `.pi/graph/` 워크플로를 통해 Jira에 발행합니다. See `docs/agents/issue-tracker.md`.

### Domain docs

단일 컨텍스트 구조를 사용하며 루트 `GLOSSARY.md`와 `docs/adr/`를 읽습니다. See `docs/agents/domain.md`.