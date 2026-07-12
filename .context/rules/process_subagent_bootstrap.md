# Subagent dispatch guidance

> Read when dispatching a role-specialized subagent or evaluating its result.

## Dispatch packet

Provide enough context for the subagent to act without guessing:

- role, goal, and bounded task scope;
- expected output or artifact;
- relevant issue, PR, plan, or diff;
- process files and ownership constraints that apply;
- required gates and known deviations;
- current `AGENTS_MD_VERSION` when startup alignment matters.

For Judge dispatches, state `mode: plan-gate` or `mode: diff-gate`.
If required context is unavailable, say so explicitly rather than asking the
subagent to infer it.

## Startup and output

Subagents read `AGENTS.md`, their canonical `.agents/<role>.md` file, applicable
process rules, and the supplied task context. They preserve role-specific output
contracts: Judge starts with `DECISION:` and Critic starts with
`CRITIC DECISION:`.

No serialized compliance block or role-contract version is required. Runtime
startup handshakes and context receipts remain governed by `AGENTS.md`.

## Result handling

Treat subagent output as advice or an artifact to verify, not proof that a
runtime action occurred. The parent verifies claimed edits, tests, commits, and
pushes independently before relying on them. If an edit or push did not land,
request a concrete patch or re-dispatch with the missing context; do not broaden
subagent permissions merely to bypass verification.
