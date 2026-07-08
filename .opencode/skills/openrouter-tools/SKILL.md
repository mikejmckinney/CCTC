---
name: openrouter-tools
description: |
  Use openrouter_fusion to synthesize multi-model panel responses into a
  single stronger answer, and openrouter_advisor to consult a
  higher-intelligence model for strategic guidance. Use ONLY when
  evaluating architectural tradeoffs, diagnosing hard bugs that resist
  initial attempts, stress-testing a decision before committing to it,
  researching topics where sources may disagree, or doing a pre-flight
  review on a complex refactor. Do NOT use for routine implementation,
  simple factual lookups, syntax fixes, or trivially reversible choices.
compatibility: opencode
---

# OpenRouter Fusion & Advisor

Both tools delegate reasoning to other models. They are not free — each
call adds latency and tokens, sometimes by an order of magnitude. Use
them when the cost of being wrong outweighs the cost of asking.

## What I do

- Decide whether `openrouter_fusion` or `openrouter_advisor` is the right
  tool for the task at hand
- Craft prompts that maximize the value of a panel or advisor call
- Interpret and synthesize structured multi-model analysis into a single,
  actionable user-facing answer
- Combine both tools in a pipeline (explore with fusion, validate with
  advisor)
- Recognize when these tools are a waste of time and skip them

## What I won't do

- Paste raw panel output to the user — always synthesize
- Call these tools for syntax fixes, one-liners, or boilerplate
- Treat the advisor as an oracle — critically evaluate its guidance
- Claim certainty where models disagree without flagging the disagreement
- Silently expand scope based on tool output not asked for

## When to use me

Use this skill when:
- You are evaluating a **multi-way tradeoff** (architectures, libraries,
  patterns, caching strategies)
- You are **stuck on a hard bug** that resists normal debugging
- You are about to **commit to a large, expensive direction** and want a
  pre-flight review
- You are researching a topic where **sources may disagree** or
  **training data may be stale**
- You have **new information that contradicts a prior decision**
- You have completed a **complex refactor** and need a sanity check
  beyond tests
- You are working in an **unfamiliar codebase** with unclear conventions

Do NOT load for: routine implementation tasks, simple lookups, or
decisions where the cost of being wrong is low.

---

## openrouter_fusion

Fusion runs a panel of independent models against your prompt, then a
*judge* model compares their responses and returns a structured analysis.
The tool returns `consensus`, `contradictions`, `partial_coverage`,
`unique_insights`, `blind_spots`, and the raw `responses`. The judge
treats consensus as highest-confidence; it surfaces — does not merge —
disagreements.

### When to call

| Proactive | Reactive |
|---|---|
| Before choosing an architecture, library, or pattern | Diagnosing a bug that resists initial attempts |
| Before starting a long task where course-correcting is expensive | Resolving contradictions between sources |
| Designing an interface or API contract | Evaluating whether an approach is sound after a failed attempt |
| Working in an unfamiliar codebase with unclear conventions | Stress-testing a decision when new information emerges |
| Multi-domain research where independent sources may disagree | A single-model answer feels suspiciously confident on a contested topic |

### When to skip

- A single authoritative source exists (docs, error message, spec)
- The work is routine implementation, syntax, or boilerplate
- The decision is reversible in seconds
- The answer is a simple lookup

### Prompt structure

Give the panel enough to disagree on. A prompt that just restates the
question gets consensus-only output. A useful prompt has four parts:

1. **Goal** — what the user is trying to accomplish
2. **Constraints** — non-negotiable facts (language, runtime, budget,
   deadlines, existing stack)
3. **What you've already tried** — including dead ends, so the panel
   doesn't re-suggest them
4. **Shape of answer wanted** — recommendation with reasons, or a
   trade-off table, or a critique, or a ranked list of risks

### Synthesizing the output

The structured analysis is your primary material — raw `responses` are
supporting evidence for cross-reference only.

1. **Start with `consensus`.** Treat these points as load-bearing.
2. **Read every `contradiction`.** If the disagreement is real, surface
   it to the user with both stances; do not silently pick one.
3. **Check `partial_coverage` and `unique_insights`.** These are the
   highest-value signals — points only one or two models raised. Cite the
   source model when including them in your final answer.
4. **Inspect `blind_spots`.** Fill them with your own knowledge or with a
   follow-up `openrouter_advisor` call.
5. **Glance at raw `responses` only if the structured analysis is
   incomplete** (e.g., the judge degraded — see below).
6. **Strip noise.** Discard panel responses that are off-topic,
   hallucinated, or redundant with stronger responses.

### Failure handling

Check the result status:

| Status | Behavior |
|---|---|
| `ok` with `analysis` | Proceed as above |
| `ok` with only `responses` (no `analysis`) | Judge degraded. Read raw panel responses yourself and synthesize |
| `ok` with `failed_models` array | Some panels failed; remaining responses are still valid. Note the gap |
| `error` with `failure_reason` | Do not retry blindly. If `all_panels_failed` or `insufficient_credits`, fall back to answering directly. If `rate_limited`, wait. If `fusion_invocation_capped`, use advisor or answer directly |

Fusion cannot be nested — a fusion call inside another fusion call is
rejected.

---

## openrouter_advisor

Advisor is a single call to a (typically higher-intelligence) model that
returns advice as a tool result. You then write the final answer yourself
— advisor does not write to the user. Unlike fusion, there is one
perspective, so use it when you want a *single confident* take, not a
survey of disagreement.

### When to call

- Before committing to a complex approach (pre-flight check)
- When stuck and you've exhausted obvious fixes
- Before declaring a complex task complete
- When a fresh perspective from outside the conversation's context window
  would help
- When the user explicitly asks for a second opinion

### When to skip

- Trivial steps a single model can resolve directly
- Lookups, syntax fixes, or boilerplate generation
- When the latency cost exceeds the value of a second opinion

### Parameters

| Parameter | Purpose |
|---|---|
| `model` | If your preset allows overrides: pick a model stronger than your outer model. Use `~provider/family-latest` aliases so the reference doesn't rot. If the preset pins the advisor model, this parameter is ignored — the preset's choice applies |
| `instructions` | System prompt for the advisor. Set a role: "You are a senior staff engineer. Be decisive." beats "Please advise." |
| `tools` | Only `openrouter:web_search` and `openrouter:web_fetch` are supported. Give the advisor web tools when the question needs current information |
| `forward_transcript` | When `true`, the full parent conversation is sent. Use it for context-rich decisions; leave it `false` when the prompt is self-contained (cheaper, less risk of leaking PII/secrets) |
| `name` | Only relevant for multiple-advisor setups (e.g., a "reviewer" and an "architect"); at most one entry may be unnamed |

### Prompt structure

Same four-part template as fusion (goal, constraints, tried, shape), but
be explicit about the **kind** of advice you want:

- "Critique this plan. Find the failure modes."
- "Review this code. List edge cases I missed."
- "Decide between A and B given these constraints. State your choice
  and the reason."

### After receiving guidance

- **Evaluate, don't obey** — the advisor can be wrong. Cross-check
  against the codebase
- **Synthesize into action** — turn guidance into concrete next steps
- **Cite the source** — "Based on analysis from a higher-tier
  model, the likely cause is…"
- **Verify claims independently** — the advisor is a thinking partner,
  not an oracle

### Failure handling

Advisor returns `status: "error"` on failure; continue without the
advice. Do not retry automatically — diagnose. The advisor cannot
invoke itself (no recursion).

---

## When to choose which tool

| Question shape | Tool | Why |
|---|---|---|
| "What are the trade-offs between A and B?" | Fusion | Surfaces disagreement and blind spots |
| "Should I do A or B?" | Advisor | Wants a single confident call |
| "Find flaws in this design." | Advisor (reviewer) | One sharp critic beats a committee |
| "What do experts disagree about regarding X?" | Fusion | The disagreement *is* the answer |
| "I'm stuck on this bug." | Advisor | Fast, targeted second opinion |
| "Survey arguments for and against X." | Fusion | The survey *is* the deliverable |

If unsure, default to advisor — it is cheaper, and you can always
escalate to fusion if the advisor's answer feels thin.

---

## Combined workflows

### Exploration → Validation

1. **Explore with fusion** — get diverse perspectives on a problem space
2. **Synthesize** — form a tentative recommendation from the panel
3. **Validate with advisor** — ask the advisor to stress-test your synthesis
4. **Present to user** — a recommendation with known risks, dissent noted

### Stuck → Unstuck

1. **Diagnose with advisor** — "I've tried X, Y, Z — what class of bug
   am I missing?"
2. **Investigate the lead** — run the suggested diagnostics
3. **If still stuck, escalate with fusion** — send the full debugging
   log to the panel

Stop and ask if either tool alone would be overkill — combining them is
then definitely overkill.

---

## Cost and latency

- Fusion runs multiple models in parallel — token cost is N× your
  prompt length plus N× response length
- Advisor runs one high-tier model — cheaper than fusion but slower
  than native reasoning
- Both tools add **5–30 seconds** of latency minimum
- **Calibrate**: for a 30-second task, the overhead doubles your time.
  For a 4-hour task, it's noise that may save hours of wrong direction
- Do not call either tool more than once per task phase. If the first
  call didn't resolve it, refine your prompt before calling again

---

## Anti-patterns

- **Blind copying.** Pasting raw panel output instead of synthesizing
- **Vague prompts.** "Should I use X or Y?" without context,
  constraints, or code
- **Ignoring disagreement.** Presenting the majority view as consensus
  when models are split
- **Ignoring `blind_spots`.** The whole point of the panel is to surface
  what one model would miss
- **Hardcoding model slugs (when you control the parameter).** If you can override the advisor model, use `~provider/family-latest` aliases so examples survive deprecations. If the preset pins the model, this is not applicable — the preset's choice applies
- **Forwarding transcripts unnecessarily.** `forward_transcript: true`
  is expensive and can leak PII/secrets to third-party models. Use it
  only when prior context is load-bearing for the decision
- **Overusing for trivia.** A typo does not need an advisor. A 30-line
  bash one-liner does not need fusion
- **Retrying on `rate_limited` immediately.** Back off. Retrying
  instantly turns a 429 into an account suspension
- **Calling fusion when you need one answer.** The judge will not pick a
  side; it will report the spread. Use advisor when you need a decision

---

## Worked examples

Each example follows: **Trigger** (what the user said) → **Decision**
(why this tool) → **Prompt** (what to send) → **Synthesis** (what the
agent does with the result).

### Example 1 — Architectural choice (Fusion)

**Trigger**: "We need to cache API responses. Redis or Memcached?
High-traffic Django monolith."

**Decision**: Fusion. Two viable options with real tradeoffs across
persistence, ops burden, Django integration quality.

**Prompt sent to `openrouter_fusion`**:
```
Goal: pick a cache backend for session + response caching in a
      high-traffic Django monolith (~5k req/s peak, 12 worker nodes).
Constraints: must run on our existing k8s cluster (no new infra team),
             must support per-tenant invalidation, ops team knows Redis.
Trade-off question: Redis vs. Memcached. Both are viable. We need the
                    tradeoffs, not a recommendation yet.
Shape of answer: structured analysis — consensus, contradictions,
                 and blind spots a single model would miss.
```

**Synthesis**: Pull `consensus` (Redis is the lower-risk default for
this team), surface `contradictions` (memory pressure projections split
3-2 — one model argues Memcached's lower per-connection overhead wins at
this scale, others argue Redis pub/sub is needed for invalidation),
present the recommendation but let the user weigh the unresolved
contradiction.

### Example 2 — Bug unsticking (Advisor, with web tools)

**Trigger**: "Intermittent `ConnectionResetError` on large S3 uploads
via boto3. Basic retries didn't help."

**Decision**: Advisor with `instructions` for a role and `tools` for
web search. The bug is specific; one sharp analysis beats a committee.
(Model is controlled by the OpenRouter preset.)

**Prompt sent to `openrouter_advisor`**:
```
Goal: diagnose an intermittent ConnectionResetError on multipart S3
      uploads from a Python service using boto3. Files are 200MB-2GB.
Already tried: increasing max_pool_connections, basic retry config,
               switching to S3Transfer.
Constraints: Python 3.11, boto3 latest, runs in EKS pods.
What I want: ranked list of likely causes with the diagnostic command
             or config change that would confirm each one.
```

**Synthesis**: Extract the ranked causes, translate each into a
concrete command or config snippet the user can run, cite the advisor
as the source, and present as an actionable debugging checklist.

### Example 3 — Pre-flight review (Advisor, with transcript)

**Trigger**: "Refactored the auth module to JWTs. Tests pass. Are we
done?"

**Decision**: Advisor with `forward_transcript: true`. The advisor
needs to see the actual diff, not a summary. One critical reviewer.

**Prompt sent to `openrouter_advisor`**:
```
Review the JWT auth refactor I just completed. I have pasted the full
transcript above. List: (1) security concerns, (2) integration points I
may have missed, (3) edge cases the test suite likely doesn't cover,
(4) any migrations or rollouts that need a feature flag.
```

Set `instructions`: "You are a critical security reviewer. Find flaws.
Be specific."

**Synthesis**: Present the four lists with concrete file paths and line
references where possible. If the advisor flags a real security concern,
escalate it immediately — do not bury it in a long response.

### Example 4 — Contradictory panel (Fusion with disagreement)

**Trigger**: "Should we use server components or client components for
this dashboard?"

**Decision**: Fusion. The panel will likely split on realtime
interactivity boundaries.

**Prompt sent to `openrouter_fusion`**:
```
Goal: choose between server components vs. client components for a
      data dashboard with streaming chart updates.
Constraints: Next.js 14, 10 charts per page, team of 3 frontend devs,
             data refreshes every 5 seconds.
Question: what are the tradeoffs, and is there a hybrid approach?
```

**Synthesis**: Panel splits 3-2. Your answer: "The panel leans toward
server components for data fetching but disagrees on interactivity
boundaries. The minority view argues client components for real-time
charts. My recommendation: server-first with selective client islands
for streaming updates. The key risk flagged by the minority is
waterfall loading if not careful." Surface both sides; don't erase the
disagreement.

### Example 5 — When to skip (anti-pattern)

**Trigger**: "What's the syntax for a Python list comprehension?"

**Decision**: Do NOT call any OpenRouter tool. Answer directly. This is
a simple factual lookup.

---

## Discovery note

`openrouter_fusion` and `openrouter_advisor` are provided via the
OpenRouter provider configuration as server tools. If these tools are
not present in your available tool list, this skill's guidance does
not apply — do not fabricate or simulate them. Tools you should see if
configured: `openrouter_fusion`, `openrouter_advisor`,
`openrouter_web_search`, `openrouter_web_fetch`.

---

## Quick reference

- **Default fusion panel**: Quality preset (Claude Opus, GPT, Gemini Pro latest)
- **Advisor model**: governed by your OpenRouter preset configuration — if the preset pins a model, you cannot override it
- **Recursion**: neither tool can invoke itself. Fusion cannot be
  nested. Advisor cannot be nested
- **Cheapest call**: advisor with a fast model, no tools,
  `forward_transcript: false`
- **Most thorough**: fusion with 4-5 models, then advisor on top for
  synthesis
- **Always check `status`** before synthesizing. Failure is part of the
  contract
