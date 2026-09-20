# Graph Report - prepick-server  (2026-09-20)

## Corpus Check
- 128 files · ~55,902 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 764 nodes · 1228 edges · 46 communities (40 shown, 4 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 31 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7f3f75f8`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Q: postgresql과 mikro orm 연결했는데 진행이 안되는 이유는 뭐야
- compress.py
- package.json
- validate.py
- Consumer Backend Scope
- Caveman Learn
- Graph Outputs
- devDependencies
- compilerOptions
- dependencies
- Consumer 인증 API 설계
- Caveman Commit
- Graph Query Traversal
- Lean Build
- scripts
- Incremental Graph Update
- caveman-explore/package.json
- caveman-learn/package.json
- SessionService
- Persistent Caveman Style
- Migration
- Cavecrew
- nest-cli.json
- Caveman Stats
- Media Transcription
- Cross-Repo Graph Merge
- caveman-explore/tests/skill-file.test.mjs
- tsconfig.build.json
- caveman-learn/tests/skill-file.test.mjs
- __init__.py
- Q: 그러면 내가 어떤 테이블을 생성하면 되는지 sql문 알려줄래?
- 민감정보 안전 로깅 및 안전한 OTP 생성 설계
- Review Focus
- File Map
- PostgreSQL·MikroORM 기반 설계
- Q: [smart-order-consumer-app-PRD.md](docs/spec/smart-order-consumer-app-PRD.md) 파일을 기준으로 백엔드 개발을 시작하려고 하는데 어떤거부터 하면 좋을까?
- Q: graphql은 유지하고 PostgreSQL과 MikroORM을 사용할 때 Access Token과 Refresh Session은 어떤 방식을 추천하는가?
- Q: 데이터베이스 서버 없이 먼저 개발할 때 추천 순서는?
- PostgreSQL·MikroORM Foundation Implementation Plan
- app.module.ts
- Q: 소규모 PR에서 subagent-driven 개발 시 토큰 과다 사용을 어떻게 방지할 것인가?
- otp.service.ts
- Q: 어떤것들이 수정되었는지 알려줘
- bcrypt.d.ts

## God Nodes (most connected - your core abstractions)
1. `@nestjs/common` - 25 edges
2. `SessionService` - 22 edges
3. `User` - 22 edges
4. `compilerOptions` - 22 edges
5. `UsersService` - 19 edges
6. `_compress_file_locked()` - 18 edges
7. `OtpService` - 17 edges
8. `authError()` - 15 edges
9. `validate()` - 14 edges
10. `scripts` - 14 edges

## Surprising Connections (you probably didn't know these)
- `CLAUDE.md Graphify Integration` --semantically_similar_to--> `Graph-First Codebase Workflow`  [INFERRED] [semantically similar]
  .codex/skills/graphify/references/hooks.md → AGENTS.md
- `Graph-First Codebase Workflow` --references--> `Node Explanation Query`  [EXTRACTED]
  AGENTS.md → .codex/skills/graphify/references/query.md
- `Graph-First Codebase Workflow` --references--> `Shortest Path Query`  [EXTRACTED]
  AGENTS.md → .codex/skills/graphify/references/query.md
- `Post-Change Graph Update` --references--> `Incremental Graph Update`  [EXTRACTED]
  AGENTS.md → .codex/skills/graphify/references/update.md
- `NestJS TypeScript Starter` --conceptually_related_to--> `Consumer Backend Scope`  [INFERRED]
  README.md → docs/spec/smart-order-consumer-app-PRD.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Graph Query Feedback Loop** — _codex_skills_graphify_references_query_constrained_query_expansion, _codex_skills_graphify_references_query_graph_label_vocabulary, _codex_skills_graphify_references_query_graph_query_traversal, _codex_skills_graphify_references_query_saved_query_feedback, _codex_skills_graphify_references_query_graph_work_memory [EXTRACTED 1.00]
- **Graphify Build Pipeline** — _codex_skills_graphify_skill_file_detection, _codex_skills_graphify_skill_structural_extraction, _codex_skills_graphify_skill_semantic_extraction, _codex_skills_graphify_skill_graph_build_and_clustering, _codex_skills_graphify_skill_graph_health_check, _codex_skills_graphify_skill_community_labeling, _codex_skills_graphify_skill_graph_outputs, _codex_skills_graphify_skill_manifest_and_cost_tracking [EXTRACTED 1.00]
- **Graphify Interoperability Exports** — _codex_skills_graphify_references_exports_wiki_export, _codex_skills_graphify_references_exports_graph_database_exports, _codex_skills_graphify_references_exports_file_format_exports, _codex_skills_graphify_references_exports_mcp_server [EXTRACTED 1.00]
- **Smart Order End-to-End Journey** — docs_spec_smart_order_consumer_app_prd_authenticated_service_exploration, docs_spec_smart_order_consumer_app_prd_home_store_discovery, docs_spec_smart_order_consumer_app_prd_store_details_and_menu_catalog, docs_spec_smart_order_consumer_app_prd_menu_variant_selection, docs_spec_smart_order_consumer_app_prd_single_store_cart, docs_spec_smart_order_consumer_app_prd_checkout_without_pg_payment, docs_spec_smart_order_consumer_app_prd_order_completion, docs_spec_smart_order_consumer_app_prd_order_history [EXTRACTED 1.00]
- **Compressed Agent Communication** — _agents_skills_cavecrew_skill_compressed_subagent_delegation, _agents_skills_caveman_commit_skill_caveman_commit, _agents_skills_caveman_review_skill_terse_actionable_findings, _agents_skills_caveman_explore_skill_evidence_only_localization [INFERRED 0.85]
- **Evidence-Bounded Change Workflows** — _agents_skills_investigate_first_skill_investigate_first, _agents_skills_lean_build_skill_lean_build, _agents_skills_migration_skill_migration, _agents_skills_safe_refactor_skill_safe_refactor, _agents_skills_surgical_patch_skill_surgical_patch, _agents_skills_verify_and_stop_skill_verify_and_stop [INFERRED 0.85]
- **Incremental Graph Maintenance Pipeline** — _codex_skills_graphify_references_hooks_post_commit_graph_hook, _codex_skills_graphify_references_update_incremental_file_detection, _codex_skills_graphify_references_update_graph_build_merge, _codex_skills_graphify_references_update_semantic_manifest_stamping, _codex_skills_graphify_references_update_graph_diff [INFERRED 0.85]
- **Evidence-First Optimization Safety** — _agents_skills_caveman_evidence_review_skill_evidence_bucket_separation, _agents_skills_caveman_learn_skill_savings_evidence_rungs, _agents_skills_caveman_manage_skill_fail_closed_lifecycle_gate, _agents_skills_caveman_optimize_skill_paired_baseline_evaluation [INFERRED 0.95]
- **Operator-Controlled Changes** — _agents_skills_caveman_discover_skill_operator_approval_gate, _agents_skills_caveman_learn_skill_consent_gated_editing, _agents_skills_caveman_optimize_skill_paired_baseline_evaluation [INFERRED 0.95]

## Communities (46 total, 4 thin omitted)

### Community 0 - "Q: postgresql과 mikro orm 연결했는데 진행이 안되는 이유는 뭐야"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: postgresql과 mikro orm 연결했는데 진행이 안되는 이유는 뭐야, Source Nodes

### Community 1 - "compress.py"
Cohesion: 0.06
Nodes (61): main(), print_usage(), Caveman Compress CLI Usage: caveman <filepath>, backup_dir_for(), build_compress_prompt(), build_fix_prompt(), call_claude(), compress_file() (+53 more)

### Community 2 - "package.json"
Cohesion: 0.04
Nodes (45): author, description, jest, collectCoverageFrom, coverageDirectory, moduleFileExtensions, rootDir, testEnvironment (+37 more)

### Community 3 - "validate.py"
Cohesion: 0.10
Nodes (28): benchmark_pair(), count_tokens(), main(), print_table(), Path, count_bullets(), extract_code_blocks(), extract_fenced_spans() (+20 more)

### Community 4 - "Consumer Backend Scope"
Cohesion: 0.10
Nodes (28): Authenticated Service Exploration, Authentication API, Checkout Without PG Payment, Consumer Backend Scope, Consumer Frontend Scope, Core Order Journey, Future MVP Extensions, Home Store Discovery (+20 more)

### Community 5 - "Caveman Learn"
Cohesion: 0.08
Nodes (27): Caller-Level Workflow Labeling, Caveman Workflow Discovery, Operator Approval Gate, Workflow Labeling, Bounded Trace Comparison, Caveman Evidence Review, Evidence Bucket Separation, Evidence-Only Localization (+19 more)

### Community 6 - "Graph Outputs"
Cohesion: 0.10
Nodes (24): URL Ingestion, Folder Watch Mode, SVG and GraphML Exports, Graph Database Exports, Graphify MCP Server, Token Reduction Benchmark, Graph Wiki Export, Deterministic Node IDs (+16 more)

### Community 7 - "devDependencies"
Cohesion: 0.08
Nodes (24): devDependencies, eslint, eslint-config-prettier, @eslint/eslintrc, @eslint/js, eslint-plugin-prettier, globals, jest (+16 more)

### Community 8 - "compilerOptions"
Cohesion: 0.09
Nodes (22): compilerOptions, allowSyntheticDefaultImports, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames, incremental (+14 more)

### Community 9 - "dependencies"
Cohesion: 0.09
Nodes (22): dependencies, @apollo/server, @as-integrations/express5, axios, bcrypt, class-transformer, class-validator, date-fns (+14 more)

### Community 10 - "Consumer 인증 API 설계"
Cohesion: 0.06
Nodes (32): API 인증, AuthModule, Consumer 인증 API 설계, GraphQL E2E 테스트, GraphQL 계약, OTP 검증, OTP 요청, OTP 정책 (+24 more)

### Community 11 - "Caveman Commit"
Cohesion: 0.12
Nodes (17): Caveman Commit Overview, Caveman Commit, Commit Message Boundaries, Conventional Commits, Caveman Compress Overview, Caveman Compress Security, Constrained File Processing, Caveman Compress (+9 more)

### Community 12 - "Graph Query Traversal"
Cohesion: 0.16
Nodes (15): CLAUDE.md Graphify Integration, Breadth-First Search, Constrained Query Expansion, Depth-First Search, Graph Label Vocabulary, Graph Query Traversal, Graph Work Memory, NetworkX Traversal Fallback (+7 more)

### Community 13 - "Lean Build"
Cohesion: 0.14
Nodes (14): Investigate First Agent Interface, Evidence-Ranked Diagnosis, Investigate First, Lean Build Agent Interface, Lean Build, Narrow Observable Acceptance, Reuse Fitting Seam, Surgical Patch Agent Interface (+6 more)

### Community 14 - "scripts"
Cohesion: 0.14
Nodes (14): scripts, build, format, lint, start, start:debug, start:dev, start:prod (+6 more)

### Community 15 - "Incremental Graph Update"
Cohesion: 0.18
Nodes (11): AST Incremental Rebuild, Post-Commit Graph Hook, Cluster-Only Refresh, Code-Only Update Fast Path, Deleted Source Pruning, Graph Build Merge, Graph Diff, Incremental File Detection (+3 more)

### Community 16 - "caveman-explore/package.json"
Cohesion: 0.20
Nodes (9): description, files, license, name, private, scripts, test, type (+1 more)

### Community 17 - "caveman-learn/package.json"
Cohesion: 0.20
Nodes (9): description, files, license, name, private, scripts, test, type (+1 more)

### Community 18 - "SessionService"
Cohesion: 0.09
Nodes (26): Args, InputType, IsString, Mutation, @nestjs/graphql, reflect-metadata, AuthenticatedRequest, AuthGuard (+18 more)

### Community 19 - "Persistent Caveman Style"
Cohesion: 0.29
Nodes (8): Caveman Auto-Clarity, Caveman Communication Mode, Caveman Intensity Levels, Auto-Clarity Boundaries, User Language Preservation, Persistent Caveman Style, Simplified Technical English, Technical Integrity Under Compression

### Community 20 - "Migration"
Cohesion: 0.29
Nodes (7): Migration Agent Interface, Expand Migrate Verify Contract, Migration, Reversible Compatibility-Safe Transition, Safe Refactor Agent Interface, Behavior Preservation Boundary, Safe Refactor

### Community 21 - "Cavecrew"
Cohesion: 0.33
Nodes (6): Cavecrew Overview, Cavecrew, Cavecrew Builder, Cavecrew Investigator, Cavecrew Reviewer, Compressed Subagent Delegation

### Community 22 - "nest-cli.json"
Cohesion: 0.29
Nodes (6): collection, compilerOptions, deleteOutDir, entryFile, $schema, sourceRoot

### Community 23 - "Caveman Stats"
Cohesion: 0.50
Nodes (5): Caveman Stats, Lifetime Savings Badge, Rule Overhead and Net Savings, Session Log Token Measurement, Caveman Stats Hook Contract

### Community 24 - "Media Transcription"
Cohesion: 0.40
Nodes (5): Media Transcription, Transcripts as Documents, Whisper Domain Hint, Whisper Model Selection, Media Update Transcription

### Community 25 - "Cross-Repo Graph Merge"
Cohesion: 0.50
Nodes (4): Cross-Repo Graph Merge, GitHub Repository Cloning, Monorepo Subgraph Extraction, Repository Origin Attribute

### Community 27 - "tsconfig.build.json"
Cohesion: 0.50
Nodes (3): ./tsconfig.json, exclude, extends

### Community 30 - "Q: 그러면 내가 어떤 테이블을 생성하면 되는지 sql문 알려줄래?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: 그러면 내가 어떤 테이블을 생성하면 되는지 sql문 알려줄래?, Source Nodes

### Community 31 - "민감정보 안전 로깅 및 안전한 OTP 생성 설계"
Cohesion: 0.09
Nodes (21): 1. 전역 요청 결과 로그, 2. 요청 body 로깅 제거, 3. 실패 지점의 업무 로그, 4. OTP 생성, OTP 단위 테스트, SMS 서비스 단위 테스트, 데이터 흐름, 목표 (+13 more)

### Community 32 - "Review Focus"
Cohesion: 0.12
Nodes (16): Consumer Authentication API Implementation Plan, File Map, Global Constraints, Prerequisite Contract, Review Focus, Task 0: Verify the Database Foundation, Task 10: Final Verification and Knowledge Graph Update, Task 1: Stable GraphQL Error and Validation Contract (+8 more)

### Community 33 - "File Map"
Cohesion: 0.22
Nodes (8): File Map, Global Constraints, Safe Logging and Secure OTP Implementation Plan, Task 1: Replace response-body logging with GraphQL metadata logging, Task 2: Remove the global request-body logger, Task 3: Add masked context to SMS failures, Task 4: Generate OTPs with Node's cryptographic RNG, Task 5: Verify the PR and refresh Graphify

### Community 34 - "PostgreSQL·MikroORM 기반 설계"
Cohesion: 0.18
Nodes (10): Integration test, PostgreSQL·MikroORM 기반 설계, 검증 기준, 목표, 배경, 설정 구조, 오류와 보안, 제외 범위 (+2 more)

### Community 35 - "Q: [smart-order-consumer-app-PRD.md](docs/spec/smart-order-consumer-app-PRD.md) 파일을 기준으로 백엔드 개발을 시작하려고 하는데 어떤거부터 하면 좋을까?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: [smart-order-consumer-app-PRD.md](docs/spec/smart-order-consumer-app-PRD.md) 파일을 기준으로 백엔드 개발을 시작하려고 하는데 어떤거부터 하면 좋을까?, Source Nodes

### Community 36 - "Q: graphql은 유지하고 PostgreSQL과 MikroORM을 사용할 때 Access Token과 Refresh Session은 어떤 방식을 추천하는가?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: graphql은 유지하고 PostgreSQL과 MikroORM을 사용할 때 Access Token과 Refresh Session은 어떤 방식을 추천하는가?, Source Nodes

### Community 37 - "Q: 데이터베이스 서버 없이 먼저 개발할 때 추천 순서는?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: 데이터베이스 서버 없이 먼저 개발할 때 추천 순서는?, Source Nodes

### Community 38 - "PostgreSQL·MikroORM Foundation Implementation Plan"
Cohesion: 0.33
Nodes (5): Global Constraints, PostgreSQL·MikroORM Foundation Implementation Plan, Task 1: Runtime MikroORM options, Task 2: PostgreSQL integration harness, Task 3: Final verification

### Community 40 - "app.module.ts"
Cohesion: 0.06
Nodes (32): Catch, @apollo/server, graphql, @nestjs/apollo, @nestjs/axios, @nestjs/common, @nestjs/core, @nestjs/testing (+24 more)

### Community 41 - "Q: 소규모 PR에서 subagent-driven 개발 시 토큰 과다 사용을 어떻게 방지할 것인가?"
Cohesion: 0.50
Nodes (3): Answer, Outcome, Q: 소규모 PR에서 subagent-driven 개발 시 토큰 과다 사용을 어떻게 방지할 것인가?

### Community 43 - "otp.service.ts"
Cohesion: 0.08
Nodes (33): Context, bcrypt, @mikro-orm/core, @mikro-orm/nestjs, @mikro-orm/postgresql, @nestjs/config, @nestjs/jwt, hmacSha256() (+25 more)

### Community 46 - "Q: 어떤것들이 수정되었는지 알려줘"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: 어떤것들이 수정되었는지 알려줘, Source Nodes

## Knowledge Gaps
- **316 isolated node(s):** `name`, `version`, `license`, `private`, `type` (+311 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 423 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Work-memory lessons

**Preferred sources** — corroborated by past sessions; start here.
- `Authentication API` (4× useful, score=3.574941936)
- `database.integration-spec.ts` (2× useful, score=1.993509472)
- `Menu API` (2× useful, score=1.704815785)
- `Order API` (2× useful, score=1.704815785)
- `Consumer Backend Scope` (2× useful, score=1.704697078)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `@nestjs/common` connect `app.module.ts` to `SessionService`, `package.json`, `otp.service.ts`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **What connects `name`, `version`, `license` to the rest of the system?**
  _316 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `compress.py` be split into smaller, more focused modules?**
  _Cohesion score 0.05673076923076923 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.04440333024976873 - nodes in this community are weakly interconnected._
- **Should `validate.py` be split into smaller, more focused modules?**
  _Cohesion score 0.10160427807486631 - nodes in this community are weakly interconnected._