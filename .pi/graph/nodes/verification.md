# verification (작업)

설계대로 개발됐는지 **실제로 실행한 증거로** 확인한다. 소스 코드는 고치지 않는다. 고칠 게 보이면 보고서에 적고 verification-gate에서 반려하게 한다.

원칙(obra/superpowers `verification-before-completion`): 이 노드에서 직접 실행하고 출력과 종료 코드를 읽은 것만 증거로 쓴다. 이전 노드나 서브에이전트의 "통과했다"는 말은 증거가 아니다.

## 1. 실행 검증 (`.pi/graph/verify.md`)

verify.md에 적힌 프로젝트마다 다음을 한다.
1. 서버를 백그라운드로 띄운다: `mkdir -p <runDir>/verify-logs && nohup <서버 실행> > <runDir>/verify-logs/<프로젝트>-server.log 2>&1 & echo $!`. 출력된 PID를 기록한다. 이 명령은 바로 끝나야 한다.
2. 준비 확인 명령이 성공할 때까지 기다린다. 대기 루프는 bash 한 번으로 돌리고, bash `timeout`을 verify.md의 대기 한도 + 30초로 준다. 한도를 넘기면 실패로 기록한다.
3. e2e 명령을 실행한다. bash `timeout`을 명시한다(기본 900초). 출력을 `<runDir>/verify-logs/<프로젝트>-e2e.log`에 저장하고 종료 코드를 기록한다.
4. 서버를 종료한다(`kill <PID>`). 실패하든 성공하든 반드시 종료한다.

bash 호출에 `timeout`을 빼지 않는다. claude-bridge provider에서는 timeout 없는 bash 호출이 120초에 끊긴다.

## 2. 설계 대비 확인

티켓 스냅샷의 `AC-n`마다 판정한다.
- **충족**: AC를 직접 확인하는 e2e 시나리오가 있고 이번 실행에서 통과했다 (시나리오의 `AC-n` 표시로 찾는다)
- **부분 충족**: 단위·통합 테스트로만 확인되거나, 일부 조건만 확인된다
- **미충족**: 확인하는 테스트가 없거나 실패했다

Out of Scope 항목이 구현되어 있지 않은지도 diff(`git diff --stat <vars.baseSha>`)로 확인한다.

## 산출물: `<runDir>/verification.md`

```
# Verification — <KEY>
실행: <프로젝트별 e2e 명령> → <통과/실패, 통과 n / 실패 m>

| AC | 내용 | 판정 | 증거 |
|----|------|------|------|
| AC-1 | ... | 충족 | e2e: login.spec.ts "AC-1 ..." 통과 |

## 실패·미충족 상세
## 범위 밖 구현 여부
## 변경 요약 (git diff --stat)
```

## 완료

```
node .pi/graph/bin/graph.mjs next graph-run <KEY> verification done --data '{"reportPath":"<runDir>/verification.md","met":<n>,"partial":<n>,"unmet":<n>,"e2ePassed":<true|false>}'
```
