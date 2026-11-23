#!/usr/bin/env node
// 그래프 상태 전이 엔진. graph.json에 적힌 엣지만 따라 이동하게 강제한다.
// 사용법:
//   node .pi/graph/bin/graph.mjs init write-plan --slug <slug> [--ticket <KEY>]
//   node .pi/graph/bin/graph.mjs init graph-run --ticket <KEY>
//   node .pi/graph/bin/graph.mjs status <graph> <id>
//   node .pi/graph/bin/graph.mjs next <graph> <id> <node> <outcome> [--reason "..."] [--data '{"k":1}']
//   node .pi/graph/bin/graph.mjs list
//   node .pi/graph/bin/graph.mjs doctor
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";

const PROMOTE = ["ticketKey", "designPath", "snapshotPath", "modules", "slug"];

function sh(cmd, args, cwd) {
  try { return execFileSync(cmd, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); }
  catch { return null; }
}
const ROOT = sh("git", ["rev-parse", "--show-toplevel"], process.cwd()) || process.cwd();
const GDIR = path.join(ROOT, ".pi", "graph");
const RUNS = path.join(GDIR, "runs");

function fail(msg, extra) {
  console.log(JSON.stringify({ ok: false, error: msg, ...(extra || {}) }, null, 2));
  process.exit(1);
}
function out(obj) { console.log(JSON.stringify({ ok: true, ...obj }, null, 2)); }

function loadGraphs() {
  const file = path.join(GDIR, "graph.json");
  if (!fs.existsSync(file)) fail(`graph.json 없음: ${file}`);
  return JSON.parse(fs.readFileSync(file, "utf8")).graphs;
}
function getGraph(name) {
  const g = loadGraphs()[name];
  if (!g) fail(`알 수 없는 그래프: ${name}`, { graphs: Object.keys(loadGraphs()) });
  return g;
}
const runDir = (graph, id) => path.join(RUNS, graph, id);
const statePath = (graph, id) => path.join(runDir(graph, id), "state.json");

function loadState(graph, id) {
  const p = statePath(graph, id);
  if (!fs.existsSync(p)) fail(`실행 기록 없음: ${graph}/${id}. 먼저 init 하세요.`);
  return JSON.parse(fs.readFileSync(p, "utf8"));
}
function saveState(s) {
  s.updatedAt = new Date().toISOString();
  const p = statePath(s.graph, s.id);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p + ".tmp", JSON.stringify(s, null, 2));
  fs.renameSync(p + ".tmp", p);
}

function parseArgs(argv) {
  const pos = [], opt = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const k = a.slice(2);
      const v = argv[i + 1] !== undefined && !argv[i + 1].startsWith("--") ? argv[++i] : true;
      opt[k] = v;
    } else pos.push(a);
  }
  return { pos, opt };
}

// ---- 조건 평가 ----
function lookup(ctx, p) {
  return p.split(".").reduce((o, k) => (o == null ? undefined : o[k]), ctx);
}
function val(ctx, x) { return typeof x === "string" && /^(data|vars)\./.test(x) ? lookup(ctx, x) : x; }
function evalWhen(w, ctx) {
  if (!w) return true;
  if (w.all) return w.all.every((c) => evalWhen(c, ctx));
  if (w.any) return w.any.some((c) => evalWhen(c, ctx));
  const [op] = Object.keys(w);
  const [a, b] = w[op].map((x) => val(ctx, x));
  const num = (v) => (v === undefined ? 0 : Number(v));
  switch (op) {
    case "eq": return a === b;
    case "ne": return a !== b;
    case "gt": return num(a) > num(b);
    case "lt": return num(a) < num(b);
    case "gte": return num(a) >= num(b);
    case "lte": return num(a) <= num(b);
    default: fail(`알 수 없는 조건 연산자: ${op}`);
  }
}

// ---- 보기 ----
function outcomesFor(g, node) {
  return [...new Set(g.edges.filter((e) => e.from === node).map((e) => e.on))];
}
function view(g, s) {
  return {
    graph: s.graph, id: s.id, status: s.status,
    current: s.current.map((n) => ({
      node: n,
      kind: g.nodes[n]?.kind,
      doc: g.nodes[n] ? path.join(".pi/graph", g.nodes[n].doc) : null,
      outcomes: outcomesFor(g, n),
      requires: g.nodes[n]?.requires || [],
      feedback: s.feedback[n] || [],
    })),
    vars: s.vars,
    runDir: path.relative(ROOT, runDir(s.graph, s.id)),
    handoff: s.handoff || null,
  };
}

// ---- 명령 ----
function cmdInit(graph, opt) {
  const g = getGraph(graph);
  let id, vars = { autoFix: 0, reviewRound: 0 }, feedback = {};
  if (graph === "graph-run") {
    if (!opt.ticket) fail("graph-run은 --ticket <KEY>가 필요합니다.");
    id = String(opt.ticket);
    vars.ticketKey = id;
    const base = sh("git", ["rev-parse", "HEAD"], ROOT);
    if (!base) fail("git 저장소가 아니거나 커밋이 없습니다. base SHA를 기록할 수 없습니다.");
    vars.baseSha = base;
    const dirty = sh("git", ["status", "--porcelain", "--", ".", ":(exclude).pi/graph/runs"], ROOT);
    if (dirty) vars.dirtyAtStart = true;
  } else if (graph === "write-plan") {
    if (opt.ticket) {
      // 재설계: 기존 티켓에 연결된 plan 실행을 찾아 slug와 문서 경로를 이어받는다.
      const prev = findRuns().find((r) => r.graph === "write-plan" && r.vars.ticketKey === String(opt.ticket));
      if (!prev && !opt.slug) fail(`티켓 ${opt.ticket}에 연결된 이전 plan 실행이 없습니다. --slug도 함께 주세요.`);
      id = prev ? prev.id : String(opt.slug);
      vars.ticketKey = String(opt.ticket);
      vars.replan = true;
      if (prev?.vars.designPath) vars.designPath = prev.vars.designPath;
      const run = findRuns().find((r) => r.graph === "graph-run" && r.id === String(opt.ticket) && r.status === "handoff");
      if (run) feedback.plan = [{ from: run.handoff.fromNode, outcome: "reject_design", reason: run.handoff.reason, at: run.updatedAt }];
    } else {
      if (!opt.slug) fail("write-plan은 --slug <slug>가 필요합니다.");
      id = String(opt.slug);
    }
    vars.slug = id;
  } else fail(`init을 지원하지 않는 그래프: ${graph}`);

  const p = statePath(graph, id);
  if (fs.existsSync(p)) {
    const old = JSON.parse(fs.readFileSync(p, "utf8"));
    if (old.status === "running" && !opt.restart) fail(`이미 진행 중인 실행이 있습니다: ${graph}/${id}. status로 이어서 하거나 --restart를 주세요.`, view(g, old));
    fs.renameSync(runDir(graph, id), runDir(graph, id) + "." + Date.now());
  }
  const now = new Date().toISOString();
  const s = { graph, id, status: "running", current: [g.start], vars, data: {}, feedback, feedbackLog: [], history: [], createdAt: now, updatedAt: now };
  saveState(s);
  out(view(g, s));
}

function cmdNext(graph, id, node, outcome, opt) {
  const g = getGraph(graph);
  const s = loadState(graph, id);
  if (s.status !== "running") fail(`실행 상태가 ${s.status}입니다. 더 진행할 수 없습니다.`, view(g, s));
  if (!s.current.includes(node)) fail(`${node}는 현재 노드가 아닙니다.`, view(g, s));
  const def = g.nodes[node];
  let data = {};
  if (opt.data) { try { data = JSON.parse(opt.data); } catch (e) { fail(`--data JSON 파싱 실패: ${e.message}`); } }

  const missing = (def.requires || []).filter((k) => data[k] === undefined);
  if (missing.length) fail(`${node} 완료에 필요한 데이터가 빠졌습니다: ${missing.join(", ")}`);
  for (const [k, spec] of Object.entries(def.derive || {})) {
    if (spec.sum) data[k] = spec.sum.reduce((t, f) => t + Number(data[f] || 0), 0);
  }

  const cands = g.edges.filter((e) => e.from === node && e.on === outcome);
  if (!cands.length) fail(`${node}에서 '${outcome}' 결과로 나가는 엣지가 없습니다.`, { allowed: outcomesFor(g, node) });
  const ctx = { data, vars: s.vars };
  const edge = cands.find((e) => evalWhen(e.when, ctx));
  if (!edge) fail(`'${outcome}' 엣지의 조건을 만족하지 않습니다.`, { conditions: cands.map((e) => e.when), data });
  const reason = typeof opt.reason === "string" ? opt.reason : undefined;
  if (edge.requireReason && !reason) fail(`${node} → ${JSON.stringify(edge.to)} 엣지는 --reason이 필요합니다.`);

  // 상태 갱신
  for (const [k, v] of Object.entries(edge.set || {})) s.vars[k] = v;
  for (const k of edge.inc || []) s.vars[k] = (s.vars[k] || 0) + 1;
  for (const k of edge.reset || []) s.vars[k] = 0;
  s.data[node] = data;
  for (const k of PROMOTE) if (data[k] !== undefined) s.vars[k] = data[k];
  if (s.feedback[node]?.length) { s.feedbackLog.push(...s.feedback[node].map((f) => ({ ...f, consumedBy: node }))); delete s.feedback[node]; }

  let rest = s.current.filter((n) => n !== node);
  let targets = Array.isArray(edge.to) ? edge.to : [edge.to];
  targets = targets.map((t) => {
    if (t !== "$mode") return t;
    if (!s.vars.mode) fail("state.vars.mode가 없습니다. decide-mode-gate를 먼저 지나야 합니다.");
    return s.vars.mode;
  });

  const fb = reason || (edge.feedbackFrom ? `자동 수정: P0/P1 항목 반영. 보고서: ${lookup(ctx, edge.feedbackFrom)}` : undefined);
  const entry = { from: node, outcome, reason: fb, round: s.vars.reviewRound, at: new Date().toISOString() };

  let note;
  if (targets[0] === "END") {
    s.status = "done"; s.current = [];
  } else if (targets[0].startsWith("@")) {
    s.status = "handoff"; s.current = [];
    s.handoff = { graph: targets[0].slice(1), fromNode: node, reason, ticketKey: s.vars.ticketKey };
    note = `/${targets[0].slice(1)} ${s.vars.ticketKey ?? ""} 를 실행해 설계를 고친 뒤, /graph-run ${s.vars.ticketKey ?? ""} 를 다시 실행하세요.`.trim();
  } else if (edge.join) {
    const waiting = rest.filter((n) => g.edges.some((e) => e.from === n && e.join && e.to === targets[0]));
    if (waiting.length) { s.current = rest; note = `조인 대기 중: ${waiting.join(", ")} 완료 후 ${targets[0]}로 이동`; }
    else s.current = [...rest, targets[0]];
  } else {
    s.current = [...rest, ...targets];
  }
  if (fb && s.status === "running") for (const t of targets) (s.feedback[t] ||= []).push(entry);

  s.history.push({ at: entry.at, node, outcome, to: edge.to, resolved: targets, reason: fb, vars: { ...s.vars } });
  saveState(s);
  out({ ...view(g, s), note });
}

function findRuns() {
  const res = [];
  if (!fs.existsSync(RUNS)) return res;
  for (const graph of fs.readdirSync(RUNS)) {
    const gd = path.join(RUNS, graph);
    for (const id of fs.readdirSync(gd)) {
      const p = path.join(gd, id, "state.json");
      if (fs.existsSync(p)) res.push(JSON.parse(fs.readFileSync(p, "utf8")));
    }
  }
  return res;
}

// ---- doctor ----
const SKILLS = ["grill-with-docs", "grilling", "domain-modeling", "to-spec", "codebase-design", "prototype", "research",
  "tdd", "code-review", "ponytail", "differential-review", "setup-matt-pocock-skills"];

function walkFind(roots, names, maxDepth = 9) {
  const found = {};
  const seen = new Set();
  function walk(dir, d) {
    if (d > maxDepth) return;
    let real; try { real = fs.realpathSync(dir); } catch { return; }
    if (seen.has(real)) return; seen.add(real);
    let ents; try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      if (e.name === ".git" || e.name === "runs") continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory() || e.isSymbolicLink()) {
        if (names.includes(e.name) && !found[e.name] && fs.existsSync(path.join(full, "SKILL.md"))) found[e.name] = path.join(full, "SKILL.md");
        walk(full, d + 1);
      }
    }
  }
  for (const r of roots) if (fs.existsSync(r)) walk(r, 0);
  return found;
}

function cmdDoctor() {
  const checks = [];
  const add = (ok, what, hint, optional) => checks.push({ ok, what, ...(optional ? { optional: true } : {}), ...(hint && !ok ? { hint } : {}) });
  const graphs = loadGraphs();

  for (const [name, g] of Object.entries(graphs)) {
    if (!g.nodes[g.start]) add(false, `${name}: start 노드 ${g.start}가 없음`);
    for (const e of g.edges) {
      if (!g.nodes[e.from]) add(false, `${name}: 엣지 출발 노드 ${e.from}가 없음`);
      for (const t of Array.isArray(e.to) ? e.to : [e.to]) {
        if (t === "END" || t === "$mode") continue;
        if (t.startsWith("@")) { if (!graphs[t.slice(1)]) add(false, `${name}: 넘길 그래프 ${t}가 없음`); continue; }
        if (!g.nodes[t]) add(false, `${name}: 엣지 도착 노드 ${t}가 없음`);
      }
    }
    for (const [n, def] of Object.entries(g.nodes)) {
      if (!g.edges.some((e) => e.from === n)) add(false, `${name}: ${n}에서 나가는 엣지가 없음`);
      if (!fs.existsSync(path.join(GDIR, def.doc))) add(false, `${name}: 노드 지시문 없음 ${def.doc}`);
    }
  }
  if (!checks.some((c) => !c.ok)) add(true, "graph.json 구조");

  add(!!sh("git", ["rev-parse", "HEAD"], ROOT), "git 저장소와 최소 1개 커밋", "git init 후 첫 커밋을 만드세요.");
  add(!!sh("codegraph", ["version"], ROOT), "codegraph CLI", "npm i -g @colbymchenry/codegraph (없어도 동작하지만 탐색이 grep으로 대체됩니다)", true);
  add(fs.existsSync(path.join(ROOT, ".codegraph")), ".codegraph/ 인덱스", "codegraph init 으로 인덱스를 만드세요 (선택).", true);

  let cfg = {};
  try { cfg = JSON.parse(fs.readFileSync(path.join(GDIR, "config.json"), "utf8")); add(true, "config.json"); }
  catch { add(false, "config.json 읽기 실패"); }
  add(!!cfg?.jira?.projectKey, "config.json jira.projectKey", "write-jira가 처음 실행될 때 물어보지만 미리 채워두면 편합니다.", true);

  const verify = path.join(GDIR, "verify.md");
  const vtxt = fs.existsSync(verify) ? fs.readFileSync(verify, "utf8") : "";
  // 설명 문단이 아니라 "- " 항목 줄에 남은 <채우기: ...> 표시만 본다
  const vItems = vtxt.split("\n").filter((l) => /^\s*-\s/.test(l));
  add(vItems.length > 0 && !vItems.some((l) => l.includes("<채우기")), "verify.md 채움", ".pi/graph/verify.md 항목의 <채우기: ...> 부분을 프로젝트 명령으로 바꾸세요. (/graph-run의 verification 노드 전에 필요)", true);

  for (const a of ["implementer", "security-reviewer", "adversarial-modeler"])
    add(fs.existsSync(path.join(ROOT, ".pi", "agents", `${a}.md`)), `.pi/agents/${a}.md`);

  const home = os.homedir();
  const roots = [path.join(ROOT, ".pi"), path.join(ROOT, ".agents"), path.join(home, ".pi"), path.join(home, ".agents")];
  const found = walkFind(roots, SKILLS);
  const OPTIONAL_SKILLS = ["prototype", "research"];
  for (const sk of SKILLS) add(!!found[sk], `스킬 ${sk}`, "설치 여부를 확인하세요. README의 설치 절차 참고.", OPTIONAL_SKILLS.includes(sk));
  const adv = found["differential-review"] && path.join(path.dirname(found["differential-review"]), "agents", "adversarial-modeler.md");
  add(!!adv && fs.existsSync(adv), "differential-review/agents/adversarial-modeler.md", "setup.sh가 trailofbits 원본에서 복사합니다.");

  fs.writeFileSync(path.join(GDIR, "skills.json"), JSON.stringify(found, null, 2));
  const bad = checks.filter((c) => !c.ok && !c.optional);
  const warn = checks.filter((c) => !c.ok && c.optional).map((c) => c.what);
  console.log(JSON.stringify({ ok: bad.length === 0, root: ROOT, skillsJson: ".pi/graph/skills.json", failed: bad.map((c) => c.what), warnings: warn, checks }, null, 2));
  process.exit(bad.length ? 1 : 0);
}

// ---- main ----
const { pos, opt } = parseArgs(process.argv.slice(2));
const [cmd, ...rest] = pos;
switch (cmd) {
  case "init": cmdInit(rest[0], opt); break;
  case "status": { const g = getGraph(rest[0]); out(view(g, loadState(rest[0], rest[1]))); break; }
  case "next": {
    if (rest.length < 4) fail("next <graph> <id> <node> <outcome> [--reason] [--data]");
    cmdNext(rest[0], rest[1], rest[2], rest[3], opt); break;
  }
  case "list": out({ runs: findRuns().map((r) => ({ graph: r.graph, id: r.id, status: r.status, current: r.current, updatedAt: r.updatedAt })) }); break;
  case "doctor": cmdDoctor(); break;
  default: fail("명령: init | status | next | list | doctor");
}