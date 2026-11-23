#!/usr/bin/env bash
# 그래프 실행에 필요한 외부 준비를 한다. 어디서 실행해도 된다: bash <프로젝트>/.pi/graph/setup.sh
set -euo pipefail

# 이 스크립트는 <프로젝트>/.pi/graph/setup.sh 에 있다. 프로젝트 루트로 이동한다.
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"
echo "프로젝트: $PROJECT_ROOT"

PI_HOME="${PI_CODING_AGENT_DIR:-$HOME/.pi/agent}"
VENDOR="$PI_HOME/vendor/trailofbits-skills"
SKILL_DST="$PI_HOME/skills/differential-review"

echo "== 1. trailofbits differential-review 설치"
if [ -d "$VENDOR/.git" ]; then
  git -C "$VENDOR" pull --ff-only --quiet
else
  mkdir -p "$(dirname "$VENDOR")"
  git clone --quiet --depth 1 https://github.com/trailofbits/skills.git "$VENDOR"
fi
rm -rf "$SKILL_DST"
mkdir -p "$SKILL_DST/agents"
cp -R "$VENDOR/plugins/differential-review/skills/differential-review/." "$SKILL_DST/"
cp "$VENDOR/plugins/differential-review/agents/adversarial-modeler.md" "$SKILL_DST/agents/"
cp "$VENDOR/LICENSE" "$SKILL_DST/LICENSE"   # CC-BY-SA-4.0, 원본 라이선스 유지
echo "   → $SKILL_DST"

echo "== 2. codegraph (선택)"
if command -v codegraph >/dev/null 2>&1; then
  echo "   codegraph 있음."
  [ -d .codegraph ] || echo "   이 프로젝트는 아직 인덱스가 없습니다: codegraph init  (git에 안 올리려면 --local-only)"
  echo "   pi에 MCP 도구를 연결하려면(처음 한 번): codegraph install  → Pi 선택"
else
  echo "   codegraph 없음 (없어도 동작). 설치: npm i -g @colbymchenry/codegraph  또는 README의 install.sh"
fi

echo "== 3. hurl / playwright (verify.md에 쓸 도구, 해당하는 것만)"
command -v hurl >/dev/null 2>&1 && echo "   hurl 있음" || echo "   hurl 없음: https://hurl.dev 설치 안내 참고"
[ -x node_modules/.bin/playwright ] && echo "   playwright 있음" || echo "   playwright 없음(프론트엔드면): npm i -D @playwright/test && npx playwright install"

echo "== 4. .gitignore"
# 파일이 줄바꿈 없이 끝나면 먼저 줄바꿈을 넣는다
if [ -s .gitignore ] && [ -n "$(tail -c 1 .gitignore)" ]; then echo >> .gitignore; fi
grep -qxF ".pi/graph/runs/" .gitignore 2>/dev/null || echo ".pi/graph/runs/" >> .gitignore
grep -qxF ".pi/graph/skills.json" .gitignore 2>/dev/null || echo ".pi/graph/skills.json" >> .gitignore

echo "== 5. doctor"
node .pi/graph/bin/graph.mjs doctor || true
echo
echo "남은 수동 단계:"
echo "  - pi 안에서 /mcp-auth atlassian 으로 로그인"
echo "  - .pi/graph/verify.md 의 <채우기> 부분 작성"
echo "  - pi 재시작 또는 /reload"
