# Graph Report - prepick-server  (2026-10-03)

## Corpus Check
- 174 files · ~82,569 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 5 file(s) not represented in the graph (top: (none) 4, .gql 1)

## Summary
- 1026 nodes · 1892 edges · 74 communities (66 shown, 8 thin omitted)
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 211 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8e8dd44e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Q: postgresql과 mikro orm 연결했는데 진행이 안되는 이유는 뭐야
- cli.py
- package.json
- validate.py
- Consumer Backend Scope
- Caveman Learn
- Graph Outputs
- devDependencies
- compilerOptions
- dependencies
- OtpService
- Caveman Commit
- Graph Query Traversal
- Lean Build
- scripts
- Incremental Graph Update
- caveman-explore/package.json
- caveman-learn/package.json
- promotions.module.ts
- Persistent Caveman Style
- Migration
- Cavecrew
- nest-cli.json
- Caveman Stats
- Media Transcription
- Cross-Repo Graph Merge
- caveman-explore/tests/skill-file.test.mjs
- tsconfig.build.json
- compress.py
- __init__.py
- Q: 그러면 내가 어떤 테이블을 생성하면 되는지 sql문 알려줄래?
- 민감정보 안전 로깅 및 안전한 OTP 생성 설계
- products.service.ts
- Path
- _compress_file_locked
- Q: [smart-order-consumer-app-PRD.md](docs/spec/smart-order-consumer-app-PRD.md) 파일을 기준으로 백엔드 개발을 시작하려고 하는데 어떤거부터 하면 좋을까?
- Q: graphql은 유지하고 PostgreSQL과 MikroORM을 사용할 때 Access Token과 Refresh Session은 어떤 방식을 추천하는가?
- Q: 데이터베이스 서버 없이 먼저 개발할 때 추천 순서는?
- stores.service.ts
- PostgreSQL·MikroORM 기반 설계
- app.module.ts
- Q: 소규모 PR에서 subagent-driven 개발 시 토큰 과다 사용을 어떻게 방지할 것인가?
- jest
- .currentUser
- AuthResolver
- otp.service.ts
- Q: 어떤것들이 수정되었는지 알려줘
- bcrypt.d.ts
- What You Must Do When Invoked
- write_bytes_atomic
- eslint.config.mjs
- User
- SessionService
- Consumer discovery integer IDs implementation plan
- LockTimeoutError
- @nestjs/common
- Consumer 인증 API 설계
- graphify reference: extra exports and benchmark
- File Map
- graphify reference: query, path, explain
- PostgreSQL·MikroORM Foundation Implementation Plan
- Review Focus
- graphify reference: add a URL and watch a folder
- graphify reference: commit hook and native CLAUDE.md integration
- graphify reference: incremental update and cluster-only
- CLAUDE.md
- graphify reference: GitHub clone and cross-repo merge
- graphify reference: transcribe video and audio
- .claude/CLAUDE.md
- extraction-spec.md
- 테스트 전략
- GraphQL 계약
- 데이터 모델

## God Nodes (most connected - your core abstractions)
1. `@nestjs/common` - 38 edges
2. `User` - 29 edges
3. `SessionService` - 25 edges
4. `UsersService` - 23 edges
5. `compilerOptions` - 22 edges
6. `@mikro-orm/postgresql` - 20 edges
7. `@nestjs/graphql` - 19 edges
8. `OtpService` - 19 edges
9. `_compress_file_locked()` - 18 edges
10. `SmsService` - 17 edges

## Surprising Connections (you probably didn't know these)
- `Task 2: Remove the global request-body logger` --references--> `AppModule`  [INFERRED]
  docs/superpowers/plans/2026-09-15-safe-logging-secure-otp.md → src/app.module.ts
- `Task 2: PostgreSQL integration harness` --references--> `AppModule`  [INFERRED]
  docs/superpowers/plans/2026-09-19-postgresql-mikroorm-foundation.md → src/app.module.ts
- `Integration test` --references--> `AppModule`  [INFERRED]
  docs/superpowers/specs/2026-09-19-postgresql-mikroorm-foundation-design.md → src/app.module.ts
- `OTP 요청` --references--> `SmsService`  [INFERRED]
  docs/superpowers/specs/2026-09-19-consumer-auth-api-design.md → src/common/sms.service.ts
- `단위 테스트` --references--> `SmsService`  [INFERRED]
  docs/superpowers/specs/2026-09-19-consumer-auth-api-design.md → src/common/sms.service.ts

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

## Communities (74 total, 8 thin omitted)

### Community 0 - "Q: postgresql과 mikro orm 연결했는데 진행이 안되는 이유는 뭐야"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: postgresql과 mikro orm 연결했는데 진행이 안되는 이유는 뭐야, Source Nodes

### Community 1 - "cli.py"
Cohesion: 0.15
Nodes (18): main(), print_usage(), Caveman Compress CLI Usage: caveman <filepath>, detect_file_type(), _is_code_line(), _is_json_content(), _is_yaml_content(), Path (+10 more)

### Community 2 - "package.json"
Cohesion: 0.06
Nodes (32): author, description, license, name, private, version, @apollo/server, @as-integrations/express5 (+24 more)

### Community 3 - "validate.py"
Cohesion: 0.09
Nodes (31): benchmark_pair(), count_tokens(), main(), print_table(), Path, count_bullets(), extract_code_blocks(), extract_fenced_spans() (+23 more)

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

### Community 10 - "OtpService"
Cohesion: 0.13
Nodes (14): Review Focus, Task 0: Verify the Database Foundation, Task 10: Final Verification and Knowledge Graph Update, Task 3: OTP Challenge Lifecycle, Task 5: Signup and Login Orchestration, Task 7: Authentication GraphQL Module and Resolver, Task 8: PostgreSQL Integration Proof, Task 9: Full GraphQL Authentication Journey and Leakage Regression (+6 more)

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

### Community 18 - "promotions.module.ts"
Cohesion: 0.20
Nodes (9): Promotion, Field, ObjectType, PromotionSchema, PromotionsResolver, Query, Resolver, PromotionsService (+1 more)

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
Cohesion: 0.33
Nodes (5): collection, compilerOptions, deleteOutDir, $schema, sourceRoot

### Community 23 - "Caveman Stats"
Cohesion: 0.50
Nodes (5): Caveman Stats, Lifetime Savings Badge, Rule Overhead and Net Savings, Session Log Token Measurement, Caveman Stats Hook Contract

### Community 24 - "Media Transcription"
Cohesion: 0.40
Nodes (5): Media Transcription, Transcripts as Documents, Whisper Domain Hint, Whisper Model Selection, Media Update Transcription

### Community 25 - "Cross-Repo Graph Merge"
Cohesion: 0.50
Nodes (4): Cross-Repo Graph Merge, GitHub Repository Cloning, Monorepo Subgraph Extraction, Repository Origin Attribute

### Community 26 - "caveman-explore/tests/skill-file.test.mjs"
Cohesion: 0.23
Nodes (8): md, skillFile, skill, ref_node_assert, ref_node_fs, ref_node_path, ref_node_test, ref_node_url

### Community 27 - "tsconfig.build.json"
Cohesion: 0.50
Nodes (3): ./tsconfig.json, exclude, extends

### Community 28 - "compress.py"
Cohesion: 0.12
Nodes (17): call_claude(), Caveman Memory Compression Orchestrator Usage: python scripts/compress.py…, r"""Strip an outer ```markdown ... ``` fence when it wraps the ENTIRE output.…, Send a prompt to Claude. Prefers the Anthropic SDK when ANTHROPIC_API_KEY is…, strip_llm_wrapper(), contextlib, errno, fcntl (+9 more)

### Community 30 - "Q: 그러면 내가 어떤 테이블을 생성하면 되는지 sql문 알려줄래?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: 그러면 내가 어떤 테이블을 생성하면 되는지 sql문 알려줄래?, Source Nodes

### Community 31 - "민감정보 안전 로깅 및 안전한 OTP 생성 설계"
Cohesion: 0.09
Nodes (21): 1. 전역 요청 결과 로그, 2. 요청 body 로깅 제거, 3. 실패 지점의 업무 로그, 4. OTP 생성, OTP 단위 테스트, SMS 서비스 단위 테스트, 데이터 흐름, 목표 (+13 more)

### Community 32 - "products.service.ts"
Cohesion: 0.06
Nodes (49): Consumer 매장 상품(메뉴) Implementation Plan, File Structure, Global Constraints, Review Focus, Task 1: discovery 파일 이름 변경과 validateId 이동, Task 2: 상품·SKU 매핑을 ProductsModule로 이동, Task 3: 상품 조회 서비스, Task 4: GraphQL resolver와 스키마 (+41 more)

### Community 33 - "Path"
Cohesion: 0.17
Nodes (16): backup_dir_for(), compress_file(), file_lock(), is_sensitive_path(), lock_path_for(), Path, Out-of-tree backup dir for filepath, keyed by its parent dir name — kept…, Cross-session lock path keyed on the same (parent-dir-name, stem) identity… (+8 more)

### Community 34 - "_compress_file_locked"
Cohesion: 0.12
Nodes (16): build_compress_prompt(), build_fix_prompt(), _compress_file_locked(), first_nonblank_line(), _is_smaller_than_body(), mask_code_blocks(), Read a source file as UTF-8, returning (text, line_terminator, raw_bytes).…, Return the first non-blank line, stripped — used to detect a prose preamble… (+8 more)

### Community 35 - "Q: [smart-order-consumer-app-PRD.md](docs/spec/smart-order-consumer-app-PRD.md) 파일을 기준으로 백엔드 개발을 시작하려고 하는데 어떤거부터 하면 좋을까?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: [smart-order-consumer-app-PRD.md](docs/spec/smart-order-consumer-app-PRD.md) 파일을 기준으로 백엔드 개발을 시작하려고 하는데 어떤거부터 하면 좋을까?, Source Nodes

### Community 36 - "Q: graphql은 유지하고 PostgreSQL과 MikroORM을 사용할 때 Access Token과 Refresh Session은 어떤 방식을 추천하는가?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: graphql은 유지하고 PostgreSQL과 MikroORM을 사용할 때 Access Token과 Refresh Session은 어떤 방식을 추천하는가?, Source Nodes

### Community 37 - "Q: 데이터베이스 서버 없이 먼저 개발할 때 추천 순서는?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: 데이터베이스 서버 없이 먼저 개발할 때 추천 순서는?, Source Nodes

### Community 38 - "stores.service.ts"
Cohesion: 0.07
Nodes (52): Consumer Store Discovery GraphQL Implementation Plan, File Structure, Global Constraints, Review Focus, Task 1: 입력 검증과 커서, Task 2: 매장 주변·신규·상세 조회, Task 3: 매장·상품명 통합 검색, Task 4: 프로모션과 전체 연결 확인 (+44 more)

### Community 39 - "PostgreSQL·MikroORM 기반 설계"
Cohesion: 0.18
Nodes (10): Integration test, PostgreSQL·MikroORM 기반 설계, 검증 기준, 목표, 배경, 설정 구조, 오류와 보안, 제외 범위 (+2 more)

### Community 40 - "app.module.ts"
Cohesion: 0.13
Nodes (15): Catch, Task 1: Stable GraphQL Error and Validation Contract, graphql, ref_jest_globals, @nestjs/core, @nestjs/graphql, @nestjs/testing, ref_path (+7 more)

### Community 41 - "Q: 소규모 PR에서 subagent-driven 개발 시 토큰 과다 사용을 어떻게 방지할 것인가?"
Cohesion: 0.50
Nodes (3): Answer, Outcome, Q: 소규모 PR에서 subagent-driven 개발 시 토큰 과다 사용을 어떻게 방지할 것인가?

### Community 42 - "jest"
Cohesion: 0.18
Nodes (11): jest, collectCoverageFrom, coverageDirectory, moduleFileExtensions, rootDir, testEnvironment, testPathIgnorePatterns, testRegex (+3 more)

### Community 43 - ".currentUser"
Cohesion: 0.19
Nodes (15): Context, Consumer Authentication API Implementation Plan, File Map, Global Constraints, Prerequisite Contract, AuthModule, UsersModule, 모듈 구조 (+7 more)

### Community 44 - "AuthResolver"
Cohesion: 0.12
Nodes (18): API 인증, OTP 검증, OTP 요청, Token refresh, 단일 기기 로그인, 로그인, 인증 흐름, 회원가입과 자동 로그인 (+10 more)

### Community 45 - "otp.service.ts"
Cohesion: 0.19
Nodes (12): Task 3: Add masked context to SMS failures, @nestjs/axios, @nestjs/config, ref_node_crypto, hmacSha256(), safeEqual(), sha256(), OtpChallenge (+4 more)

### Community 46 - "Q: 어떤것들이 수정되었는지 알려줘"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: 어떤것들이 수정되었는지 알려줘, Source Nodes

### Community 49 - "What You Must Do When Invoked"
Cohesion: 0.08
Nodes (24): For /graphify add and --watch, For /graphify query, For the commit hook and native CLAUDE.md integration, For --update and --cluster-only, /graphify, Honesty Rules, Interpreter guard for subcommands, Part A - Structural extraction for code files (+16 more)

### Community 50 - "write_bytes_atomic"
Cohesion: 0.40
Nodes (6): Write ``text`` to ``path`` atomically as UTF-8. Path.write_text() truncates the…, Write ``data`` to ``path`` atomically, preserving permission bits., Write to the target file, surfacing the backup location if the write itself…, write_bytes_atomic(), _write_target(), write_text_atomic()

### Community 51 - "eslint.config.mjs"
Cohesion: 0.40
Nodes (4): @eslint/js, eslint-plugin-prettier, globals, typescript-eslint

### Community 52 - "User"
Cohesion: 0.15
Nodes (16): Task 2: User Persistence and Phone Normalization, Task 6: Global Access Guard and `currentUser`, ref_express, @mikro-orm/core, @mikro-orm/nestjs, @mikro-orm/postgresql, @nestjs/jwt, RefreshSession (+8 more)

### Community 53 - "SessionService"
Cohesion: 0.16
Nodes (16): Task 4: Stateless Access Tokens and Rotating Refresh Sessions, InputType, IsString, class-validator, randomToken(), AuthPayload, LoginInput, OtpRequestPayload (+8 more)

### Community 54 - "Consumer discovery integer IDs implementation plan"
Cohesion: 0.22
Nodes (4): Consumer discovery integer IDs implementation plan, Global Constraints, 기존 UUID 데이터 전환, 인증 테이블 자동증가 정수 ID 전환

### Community 55 - "LockTimeoutError"
Cohesion: 0.67
Nodes (3): LockTimeoutError, Raised when another process holds the compress lock past LOCK_WAIT_SECONDS., TimeoutError

### Community 56 - "@nestjs/common"
Cohesion: 0.14
Nodes (11): bcrypt, @nestjs/common, authError(), AuthErrorCode, AuthenticatedRequest, AuthGuard, Injectable, OtpChallengeSchema (+3 more)

### Community 57 - "Consumer 인증 API 설계"
Cohesion: 0.22
Nodes (8): Consumer 인증 API 설계, OTP 정책, 배경, 보안과 로깅, 오류 계약, 입력 검증, 제외 범위, ResponseLoggingPlugin

### Community 58 - "graphify reference: extra exports and benchmark"
Cohesion: 0.22
Nodes (8): graphify reference: extra exports and benchmark, Step 6b - Wiki (only if --wiki flag), Step 7 - Neo4j export (only if --neo4j or --neo4j-push flag), Step 7a - FalkorDB export (only if --falkordb or --falkordb-push flag), Step 7b - SVG export (only if --svg flag), Step 7c - GraphML export (only if --graphml flag), Step 7d - MCP server (only if --mcp flag), Step 8 - Token reduction benchmark (only if total_words > 5000)

### Community 59 - "File Map"
Cohesion: 0.25
Nodes (7): File Map, Global Constraints, Safe Logging and Secure OTP Implementation Plan, Task 1: Replace response-body logging with GraphQL metadata logging, Task 2: Remove the global request-body logger, Task 4: Generate OTPs with Node's cryptographic RNG, Task 5: Verify the PR and refresh Graphify

### Community 60 - "graphify reference: query, path, explain"
Cohesion: 0.33
Nodes (5): For /graphify explain, For /graphify path, graphify reference: query, path, explain, Step 0 — Constrained query expansion (REQUIRED before traversal), Step 1 — Traversal

### Community 61 - "PostgreSQL·MikroORM Foundation Implementation Plan"
Cohesion: 0.33
Nodes (5): Global Constraints, PostgreSQL·MikroORM Foundation Implementation Plan, Task 1: Runtime MikroORM options, Task 2: PostgreSQL integration harness, Task 3: Final verification

### Community 62 - "Review Focus"
Cohesion: 0.50
Nodes (4): Review Focus, Task 1: Cursor and ORM mappings, Task 2: Store queries and GraphQL boundary, Task 3: Manual migration and verification

### Community 63 - "graphify reference: add a URL and watch a folder"
Cohesion: 0.50
Nodes (3): For /graphify add, For --watch, graphify reference: add a URL and watch a folder

### Community 64 - "graphify reference: commit hook and native CLAUDE.md integration"
Cohesion: 0.50
Nodes (3): For git commit hook, For native CLAUDE.md integration, graphify reference: commit hook and native CLAUDE.md integration

### Community 65 - "graphify reference: incremental update and cluster-only"
Cohesion: 0.50
Nodes (3): For --cluster-only, For --update (incremental re-extraction), graphify reference: incremental update and cluster-only

### Community 71 - "테스트 전략"
Cohesion: 0.50
Nodes (4): GraphQL E2E 테스트, PostgreSQL 통합 테스트, 단위 테스트, 테스트 전략

### Community 72 - "GraphQL 계약"
Cohesion: 0.50
Nodes (4): GraphQL 계약, 공개 Mutation, 인증 필요 Query, 주요 입력과 응답

### Community 73 - "데이터 모델"
Cohesion: 0.50
Nodes (4): OtpChallenge, RefreshSession, User, 데이터 모델

## Knowledge Gaps
- **353 isolated node(s):** `name`, `version`, `license`, `private`, `type` (+348 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 504 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Work-memory lessons

**Preferred sources** — corroborated by past sessions; start here.
- `Authentication API` (4× useful, score=3.574941936)
- `database.integration-spec.ts` (2× useful, score=1.993509472)
- `Menu API` (2× useful, score=1.704815785)
- `Order API` (2× useful, score=1.704815785)
- `Consumer Backend Scope` (2× useful, score=1.704697078)

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@nestjs/common` connect `@nestjs/common` to `products.service.ts`, `package.json`, `stores.service.ts`, `app.module.ts`, `AuthResolver`, `otp.service.ts`, `promotions.module.ts`, `User`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Why does `AppModule` connect `app.module.ts` to `products.service.ts`, `stores.service.ts`, `PostgreSQL·MikroORM 기반 설계`, `OtpService`, `otp.service.ts`, `File Map`, `PostgreSQL·MikroORM Foundation Implementation Plan`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Are the 7 inferred relationships involving `User` (e.g. with `Consumer Authentication API Implementation Plan` and `File Map`) actually correct?**
  _`User` has 7 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `SessionService` (e.g. with `Task 5: Signup and Login Orchestration` and `Task 6: Global Access Guard and `currentUser``) actually correct?**
  _`SessionService` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 4 inferred relationships involving `UsersService` (e.g. with `Task 2: User Persistence and Phone Normalization` and `Task 3: OTP Challenge Lifecycle`) actually correct?**
  _`UsersService` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `name`, `version`, `license` to the rest of the system?**
  _353 weakly-connected nodes found - possible documentation gaps or missing edges._