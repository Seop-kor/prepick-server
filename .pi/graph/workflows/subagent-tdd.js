// subagent-tdd 노드용 pi-subagents 워크플로 스크립트.
// 모듈 작업을 순서대로 implementer에게 맡긴다. 한 작업이 done이 아니면 거기서 멈춘다.
// 실행: subagent({ workflow: ".pi/graph/workflows/subagent-tdd.js", async: true, args: {...} })
// 검사: subagent({ action: "validate", workflow: ".pi/graph/workflows/subagent-tdd.js" })

const schema = {
  type: "object",
  properties: {
    status: { enum: ["done", "blocked"] },
    reason: { type: "string" },
    changedFiles: { type: "array", items: { type: "string" } },
    testsRun: { type: "string" },
    notes: { type: "string" }
  },
  required: ["status", "changedFiles", "testsRun"],
  additionalProperties: false
};

function taskText(t) {
  return [
    "모듈 '" + t.module + "'을 TDD로 구현한다.",
    "",
    "- 공통 규칙: .pi/graph/nodes/_tdd-common.md 를 먼저 읽고 따른다.",
    "- 티켓 스냅샷: " + args.snapshotPath,
    "- 이 작업의 범위: " + t.brief,
    args.feedbackPath ? "- 반영할 리뷰 보고서(P0/P1만): " + args.feedbackPath : "",
    args.feedbackText ? "- 반영할 사용자 반려 사유: " + args.feedbackText : "",
    "",
    "다른 모듈의 범위는 건드리지 않는다. 커밋하지 않는다.",
    "제품·범위 결정이 필요하면 contact_supervisor(reason: need_decision)로 묻는다.",
    "끝나면 이 모듈 범위의 테스트를 실행하고, 실행한 명령과 결과를 testsRun에 적는다.",
    "진행할 수 없으면 status를 blocked로 하고 reason에 이유를 적는다."
  ].filter((line) => line !== "").join("\n");
}

const results = [];
for (const t of args.tasks) {
  const r = await runs.run(t.key, {
    label: "implement " + t.module,
    agent: "implementer",
    task: taskText(t),
    outputSchema: schema
  });
  const out = r.structuredOutput || { status: "blocked", reason: "structured output 없음", changedFiles: [], testsRun: "" };
  results.push({ key: t.key, module: t.module, ok: r.ok, ...out });
  if (!r.ok || out.status !== "done") break;
}

return {
  allDone: results.length === args.tasks.length && results.every((x) => x.ok && x.status === "done"),
  results
};
