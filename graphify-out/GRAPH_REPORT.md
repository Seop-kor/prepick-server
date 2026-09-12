# Graph Report - prepick-server  (2026-09-13)

## Corpus Check
- Corpus is ~34,946 words - fits in a single context window. You may not need a graph.

## Summary
- 485 nodes · 598 edges · 31 communities (27 shown, 3 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- NestJS Application Core
- Caveman Compression Engine
- Project Package Manifest
- Compression Validation Tools
- Smart Order Product
- Caveman Cloud Lifecycle
- Graphify Extraction Exports
- Development Tooling Dependencies
- TypeScript Compiler Config
- Runtime Dependencies
- Caveman Classification CLI
- Caveman Utility Skills
- Graph Query System
- Safe Change Workflows
- NPM Project Scripts
- Incremental Graph Updates
- Explorer Package Config
- Learning Package Config
- Jest Test Configuration
- Caveman Communication Mode
- Migration and Refactoring
- Cavecrew Delegation
- Nest CLI Configuration
- Token Usage Measurement
- Media Transcription
- Repository Graph Merge
- Explorer Skill Tests
- Build TypeScript Config
- Learning Skill Test
- Compression Python Package

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 21 edges
2. `_compress_file_locked()` - 18 edges
3. `validate()` - 14 edges
4. `scripts` - 13 edges
5. `detect_file_type()` - 9 edges
6. `@nestjs/common` - 9 edges
7. `backup_dir_for()` - 8 edges
8. `file_lock()` - 8 edges
9. `should_compress()` - 8 edges
10. `jest` - 8 edges

## Surprising Connections (you probably didn't know these)
- `CLAUDE.md Graphify Integration` --semantically_similar_to--> `Graph-First Codebase Workflow`  [INFERRED] [semantically similar]
  .codex/skills/graphify/references/hooks.md → AGENTS.md
- `Graph-First Codebase Workflow` --references--> `Shortest Path Query`  [EXTRACTED]
  AGENTS.md → .codex/skills/graphify/references/query.md
- `Graph-First Codebase Workflow` --references--> `Node Explanation Query`  [EXTRACTED]
  AGENTS.md → .codex/skills/graphify/references/query.md
- `Post-Change Graph Update` --references--> `Incremental Graph Update`  [EXTRACTED]
  AGENTS.md → .codex/skills/graphify/references/update.md
- `NestJS TypeScript Starter` --conceptually_related_to--> `Consumer Backend Scope`  [INFERRED]
  README.md → docs/spec/smart-order-consumer-app-PRD.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Compressed Agent Communication** — _agents_skills_cavecrew_skill_compressed_subagent_delegation, _agents_skills_caveman_commit_skill_caveman_commit, _agents_skills_caveman_review_skill_terse_actionable_findings, _agents_skills_caveman_explore_skill_evidence_only_localization [INFERRED 0.85]
- **Evidence-First Optimization Safety** — _agents_skills_caveman_evidence_review_skill_evidence_bucket_separation, _agents_skills_caveman_learn_skill_savings_evidence_rungs, _agents_skills_caveman_manage_skill_fail_closed_lifecycle_gate, _agents_skills_caveman_optimize_skill_paired_baseline_evaluation [INFERRED 0.95]
- **Operator-Controlled Changes** — _agents_skills_caveman_discover_skill_operator_approval_gate, _agents_skills_caveman_learn_skill_consent_gated_editing, _agents_skills_caveman_optimize_skill_paired_baseline_evaluation [INFERRED 0.95]
- **Evidence-Bounded Change Workflows** — _agents_skills_investigate_first_skill_investigate_first, _agents_skills_lean_build_skill_lean_build, _agents_skills_migration_skill_migration, _agents_skills_safe_refactor_skill_safe_refactor, _agents_skills_surgical_patch_skill_surgical_patch, _agents_skills_verify_and_stop_skill_verify_and_stop [INFERRED 0.85]
- **Graphify Build Pipeline** — _codex_skills_graphify_skill_file_detection, _codex_skills_graphify_skill_structural_extraction, _codex_skills_graphify_skill_semantic_extraction, _codex_skills_graphify_skill_graph_build_and_clustering, _codex_skills_graphify_skill_graph_health_check, _codex_skills_graphify_skill_community_labeling, _codex_skills_graphify_skill_graph_outputs, _codex_skills_graphify_skill_manifest_and_cost_tracking [EXTRACTED 1.00]
- **Graphify Interoperability Exports** — _codex_skills_graphify_references_exports_wiki_export, _codex_skills_graphify_references_exports_graph_database_exports, _codex_skills_graphify_references_exports_file_format_exports, _codex_skills_graphify_references_exports_mcp_server [EXTRACTED 1.00]
- **Graph Query Feedback Loop** — _codex_skills_graphify_references_query_constrained_query_expansion, _codex_skills_graphify_references_query_graph_label_vocabulary, _codex_skills_graphify_references_query_graph_query_traversal, _codex_skills_graphify_references_query_saved_query_feedback, _codex_skills_graphify_references_query_graph_work_memory [EXTRACTED 1.00]
- **Incremental Graph Maintenance Pipeline** — _codex_skills_graphify_references_hooks_post_commit_graph_hook, _codex_skills_graphify_references_update_incremental_file_detection, _codex_skills_graphify_references_update_graph_build_merge, _codex_skills_graphify_references_update_semantic_manifest_stamping, _codex_skills_graphify_references_update_graph_diff [INFERRED 0.85]
- **Smart Order End-to-End Journey** — docs_spec_smart_order_consumer_app_prd_authenticated_service_exploration, docs_spec_smart_order_consumer_app_prd_home_store_discovery, docs_spec_smart_order_consumer_app_prd_store_details_and_menu_catalog, docs_spec_smart_order_consumer_app_prd_menu_variant_selection, docs_spec_smart_order_consumer_app_prd_single_store_cart, docs_spec_smart_order_consumer_app_prd_checkout_without_pg_payment, docs_spec_smart_order_consumer_app_prd_order_completion, docs_spec_smart_order_consumer_app_prd_order_history [EXTRACTED 1.00]

## Communities (31 total, 3 thin omitted)

### Community 0 - "NestJS Application Core"
Cohesion: 0.06
Nodes (26): Query, @nestjs/apollo, @nestjs/axios, @nestjs/common, @nestjs/config, @nestjs/core, @nestjs/graphql, @nestjs/testing (+18 more)

### Community 1 - "Caveman Compression Engine"
Cohesion: 0.08
Nodes (46): backup_dir_for(), build_compress_prompt(), build_fix_prompt(), call_claude(), compress_file(), _compress_file_locked(), file_lock(), first_nonblank_line() (+38 more)

### Community 2 - "Project Package Manifest"
Cohesion: 0.05
Nodes (38): author, description, license, name, private, version, @apollo/server, @as-integrations/express5 (+30 more)

### Community 3 - "Compression Validation Tools"
Cohesion: 0.10
Nodes (28): benchmark_pair(), count_tokens(), main(), print_table(), Path, count_bullets(), extract_code_blocks(), extract_fenced_spans() (+20 more)

### Community 4 - "Smart Order Product"
Cohesion: 0.10
Nodes (28): Authenticated Service Exploration, Authentication API, Checkout Without PG Payment, Consumer Backend Scope, Consumer Frontend Scope, Core Order Journey, Future MVP Extensions, Home Store Discovery (+20 more)

### Community 5 - "Caveman Cloud Lifecycle"
Cohesion: 0.08
Nodes (27): Caller-Level Workflow Labeling, Caveman Workflow Discovery, Operator Approval Gate, Workflow Labeling, Bounded Trace Comparison, Caveman Evidence Review, Evidence Bucket Separation, Evidence-Only Localization (+19 more)

### Community 6 - "Graphify Extraction Exports"
Cohesion: 0.10
Nodes (24): URL Ingestion, Folder Watch Mode, SVG and GraphML Exports, Graph Database Exports, Graphify MCP Server, Token Reduction Benchmark, Graph Wiki Export, Deterministic Node IDs (+16 more)

### Community 7 - "Development Tooling Dependencies"
Cohesion: 0.08
Nodes (24): devDependencies, eslint, eslint-config-prettier, @eslint/eslintrc, @eslint/js, eslint-plugin-prettier, globals, jest (+16 more)

### Community 8 - "TypeScript Compiler Config"
Cohesion: 0.09
Nodes (21): compilerOptions, allowSyntheticDefaultImports, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, forceConsistentCasingInFileNames, incremental (+13 more)

### Community 9 - "Runtime Dependencies"
Cohesion: 0.11
Nodes (19): dependencies, @apollo/server, @as-integrations/express5, axios, bcrypt, class-transformer, class-validator, date-fns (+11 more)

### Community 10 - "Caveman Classification CLI"
Cohesion: 0.18
Nodes (15): main(), print_usage(), Caveman Compress CLI Usage: caveman <filepath>, detect_file_type(), _is_code_line(), _is_json_content(), _is_yaml_content(), Path (+7 more)

### Community 11 - "Caveman Utility Skills"
Cohesion: 0.12
Nodes (17): Caveman Commit Overview, Caveman Commit, Commit Message Boundaries, Conventional Commits, Caveman Compress Overview, Caveman Compress Security, Constrained File Processing, Caveman Compress (+9 more)

### Community 12 - "Graph Query System"
Cohesion: 0.16
Nodes (15): CLAUDE.md Graphify Integration, Breadth-First Search, Constrained Query Expansion, Depth-First Search, Graph Label Vocabulary, Graph Query Traversal, Graph Work Memory, NetworkX Traversal Fallback (+7 more)

### Community 13 - "Safe Change Workflows"
Cohesion: 0.14
Nodes (14): Investigate First Agent Interface, Evidence-Ranked Diagnosis, Investigate First, Lean Build Agent Interface, Lean Build, Narrow Observable Acceptance, Reuse Fitting Seam, Surgical Patch Agent Interface (+6 more)

### Community 14 - "NPM Project Scripts"
Cohesion: 0.15
Nodes (13): scripts, build, format, lint, start, start:debug, start:dev, start:prod (+5 more)

### Community 15 - "Incremental Graph Updates"
Cohesion: 0.18
Nodes (11): AST Incremental Rebuild, Post-Commit Graph Hook, Cluster-Only Refresh, Code-Only Update Fast Path, Deleted Source Pruning, Graph Build Merge, Graph Diff, Incremental File Detection (+3 more)

### Community 16 - "Explorer Package Config"
Cohesion: 0.20
Nodes (9): description, files, license, name, private, scripts, test, type (+1 more)

### Community 17 - "Learning Package Config"
Cohesion: 0.20
Nodes (9): description, files, license, name, private, scripts, test, type (+1 more)

### Community 18 - "Jest Test Configuration"
Cohesion: 0.22
Nodes (9): jest, collectCoverageFrom, coverageDirectory, moduleFileExtensions, rootDir, testEnvironment, testRegex, transform (+1 more)

### Community 19 - "Caveman Communication Mode"
Cohesion: 0.29
Nodes (8): Caveman Auto-Clarity, Caveman Communication Mode, Caveman Intensity Levels, Auto-Clarity Boundaries, User Language Preservation, Persistent Caveman Style, Simplified Technical English, Technical Integrity Under Compression

### Community 20 - "Migration and Refactoring"
Cohesion: 0.29
Nodes (7): Migration Agent Interface, Expand Migrate Verify Contract, Migration, Reversible Compatibility-Safe Transition, Safe Refactor Agent Interface, Behavior Preservation Boundary, Safe Refactor

### Community 21 - "Cavecrew Delegation"
Cohesion: 0.33
Nodes (6): Cavecrew Overview, Cavecrew, Cavecrew Builder, Cavecrew Investigator, Cavecrew Reviewer, Compressed Subagent Delegation

### Community 22 - "Nest CLI Configuration"
Cohesion: 0.33
Nodes (5): collection, compilerOptions, deleteOutDir, $schema, sourceRoot

### Community 23 - "Token Usage Measurement"
Cohesion: 0.50
Nodes (5): Caveman Stats, Lifetime Savings Badge, Rule Overhead and Net Savings, Session Log Token Measurement, Caveman Stats Hook Contract

### Community 24 - "Media Transcription"
Cohesion: 0.40
Nodes (5): Media Transcription, Transcripts as Documents, Whisper Domain Hint, Whisper Model Selection, Media Update Transcription

### Community 25 - "Repository Graph Merge"
Cohesion: 0.50
Nodes (4): Cross-Repo Graph Merge, GitHub Repository Cloning, Monorepo Subgraph Extraction, Repository Origin Attribute

### Community 27 - "Build TypeScript Config"
Cohesion: 0.50
Nodes (3): ./tsconfig.json, exclude, extends

## Knowledge Gaps
- **206 isolated node(s):** `name`, `version`, `license`, `private`, `type` (+201 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 285 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **3 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `Development Tooling Dependencies` to `Project Package Manifest`?**
  _High betweenness centrality (0.028) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Runtime Dependencies` to `Project Package Manifest`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `scripts` connect `NPM Project Scripts` to `Project Package Manifest`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **What connects `name`, `version`, `license` to the rest of the system?**
  _206 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `NestJS Application Core` be split into smaller, more focused modules?**
  _Cohesion score 0.06471631205673758 - nodes in this community are weakly interconnected._
- **Should `Caveman Compression Engine` be split into smaller, more focused modules?**
  _Cohesion score 0.07585568917668825 - nodes in this community are weakly interconnected._
- **Should `Project Package Manifest` be split into smaller, more focused modules?**
  _Cohesion score 0.052564102564102565 - nodes in this community are weakly interconnected._