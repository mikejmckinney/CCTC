# ADR-032: Retire the serialized compliance-schema subsystem

## Status

Accepted

## Date

2026-07-12

## Context

ADR-026 introduced serialized `plan_compliance`, `parent_compliance`, and
`subagent_compliance` blocks, canonical role-contract versions, Python schema
validators, fixtures, and static wiring. In practice, this duplicated runtime
startup guidance, expanded routine plans and reviews, and required broad mirror
updates without proving that an agent runtime followed instructions.

The useful controls are simpler: `AGENTS.md` already defines the authoritative
startup handshake and context receipt, `AGENTS_MD_VERSION` provides a lightweight
alignment marker, and repository checks can verify referenced files exist.
Opportunity-note requirements are documented directly in `AGENTS.md` and do not
need a Python schema validator.

This ADR supersedes ADR-026. It does not reverse ADR-011's plan-as-comment rule
or ADR-023's canonical-role/thin-overlay design.

## Decision

Remove the executable compliance-schema subsystem and all active requirements
to emit or validate serialized compliance blocks. Remove `role_contract_version`
from canonical roles and stop treating role output as a versioned compliance
packet.

Retain:

- the `AGENTS_MD_VERSION` marker;
- the runtime startup handshake and context receipt in `AGENTS.md`;
- handshake/version alignment checks;
- required-file and referenced-file existence checks;
- concise dispatch context, ownership, gate, and independent-verification
  guidance;
- PyYAML, because backlog-to-issues tooling still uses it; and
- the human-readable `opportunity_notes` requirements in `AGENTS.md`.

## Options Considered

### Keep and simplify the schemas

Rejected. Even a smaller serialized contract preserves duplicate evidence and
validator maintenance without establishing runtime truth.

### Keep schemas as optional examples

Rejected. Optional examples would remain a stale alternate process and invite
active references to return.

### Remove schemas and retain direct runtime guidance (chosen)

This preserves the controls that affect behavior while deleting ceremony and
single-purpose implementation.

## Consequences

### Positive

- Plans, PRs, and subagent responses no longer carry large duplicated YAML.
- Role files and mirrors change only when role behavior changes.
- CI retains concrete version, handshake, and file-reference checks.
- Opportunity notes remain readable and enforceable through review.

### Negative

- CI no longer validates a machine-readable record of claimed process steps.
- Reviewers must inspect normal plan, PR, and runtime receipt prose directly.

### Neutral

- Historical ADRs, postmortems, and session records keep their original
  descriptions of ADR-026 artifacts.
- PyYAML remains an installation dependency for unrelated backlog tooling.

## Migration Notes

- Delete compliance schema code, validators, fixtures, tests, and smoke prompts.
- Remove compliance blocks from plan and PR templates.
- Remove `role_contract_version` and compliance-return sections from role files.
- Replace schema references in active guides, prompts, checks, and indexes with
  direct handshake, dispatch, verification, or opportunity-note guidance.
- Existing historical records containing compliance blocks remain valid history
  but are not templates for new work.

## Verification

- Search active files for deleted artifact names and serialized block keys.
- Run `./test.sh`, shell formatting checks, and shellcheck where available.
- Confirm `scripts/checks/040-file-content.sh` still verifies the version marker
  and handshake alignment.

## References

- [ADR-026](./adr-026-compliance-contracts.md) — superseded by this decision.
- [ADR-011](./adr-011-plan-as-comment-requirement.md) — plan-as-comment remains.
- [ADR-023](./adr-023-shared-subagent-canonical.md) — canonical roles remain.
