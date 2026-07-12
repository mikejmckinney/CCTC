---
description: No-edit smoke test for runtime handshake and exact-output role positioning.
agent: agent
---

# Handshake and response-shape smoke test

Do not edit files, commit, or push.

## Parent scenario

1. Read `AGENTS.md` and extract the current `AGENTS_MD_VERSION`.
2. Emit the required `Session handshake v<N>` before other content.
3. Emit the runtime context receipt required by `AGENTS.md`.
4. Confirm every referenced file exists.

## Exact-output role scenarios

For Judge input, verify the first emitted characters are `DECISION:`. For Critic
input, verify the first emitted characters are `CRITIC DECISION:`. Any runtime
handshake or context receipt follows the role-specific output so it cannot break
the exact first-line contract.

## Pass conditions

- The parent handshake version equals `AGENTS_MD_VERSION`.
- Receipt file paths exist or are explicitly reported missing.
- Judge and Critic preserve their exact first-line contracts.
- No serialized compliance YAML is required.
