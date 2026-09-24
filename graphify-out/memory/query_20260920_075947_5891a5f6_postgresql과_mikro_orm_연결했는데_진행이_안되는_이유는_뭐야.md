---
type: "query"
date: "2026-09-20T07:59:47.769060+00:00"
question: "postgresql과 mikro orm 연결했는데 진행이 안되는 이유는 뭐야"
contributor: "graphify"
outcome: "useful"
source_nodes: ["PostgreSQL·MikroORM 기반 설계", "Task 0: Verify the Database Foundation", "mikro-orm.options.ts", "database.integration-spec.ts"]
---

# Q: postgresql과 mikro orm 연결했는데 진행이 안되는 이유는 뭐야

## Answer

Expanded from original query via graph vocab: [postgresql, mikro, orm, database, foundation, schema, table, constraints, authentication]. PostgreSQL/MikroORM wiring is present, but the auth plan separately requires manually provisioned users, otp_challenge, and refresh_session tables and constraints before Task 1. autoLoadEntities discovers registered entity metadata; it does not create tables. The foundation explicitly excludes migrations and schema sync, and the current integration smoke test proves EntityManager injection rather than auth schema presence.

## Outcome

- Signal: useful

## Source Nodes

- PostgreSQL·MikroORM 기반 설계
- Task 0: Verify the Database Foundation
- mikro-orm.options.ts
- database.integration-spec.ts