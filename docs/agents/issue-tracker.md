# Issue tracker

This repo runs mattpocock/skills inside a pi graph workflow (`.pi/graph/`).

## Specs (`to-spec`)

- Write the spec to a local file: `docs/features/<feature-slug>/design.md`.
- Do **not** publish it to any external tracker. Publishing to Jira is done by the graph's `write-jira` node after the user approves the spec at `plan-gate`.
- Triage labels are not used. Skip the "apply `ready-for-agent`" step.

## Tickets

- One feature = one Jira ticket. `to-tickets` is not used in this workflow.
- During `/graph-run`, the source of truth is the ticket snapshot at `.pi/graph/runs/graph-run/<KEY>/ticket.md`. Skills that look for "the originating issue/spec" (e.g. `code-review`) should read that file.
