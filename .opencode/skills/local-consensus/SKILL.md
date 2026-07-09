---
name: local-consensus
description: |
  Synthesize multi-model analysis by launching parallel opencode headless
  CLI sessions, and consult a stronger model for strategic guidance by
  launching a persistent opencode headless session. Use ONLY when
  evaluating architectural tradeoffs, diagnosing hard bugs, stress-testing
  decisions, researching contested topics, or doing pre-flight review on
  complex refactors. Each session inherits full filesystem and bash
  access. Do NOT use for routine implementation, simple lookups, or
  trivially reversible choices.
compatibility: opencode
---

# Local Consensus (headless CLI)

Replaces OpenRouter Fusion and Advisor with local `opencode run` sessions
that have full filesystem, bash, and workspace access — plus true session
persistence for follow-ups, auditing, and historical reference.

## Important: how sessions work

`opencode run` does **not** let you name sessions. You pass `--title` to
set a human-readable label, but opencode assigns its own session ID
(`ses_...`). You then look up that ID to use with `--continue`.

Pattern:
```bash
# Launch with a title (not --session)
opencode run --title "my-session" --model <model> "<prompt>"

# Capture the auto-generated session ID
SID=$(opencode session list --format json --max-count 10 | \
  jq -r '.[] | select(.title == "my-session") | .id' | head -1)

# Follow up with the captured ID
opencode run --session "$SID" --continue "<follow-up prompt>"
```

Never pass a made-up name to `--session` — it expects a real session ID
or it fails with "Session not found."

## What I do

- Launch **parallel** `opencode run` sessions with different models to
  simulate fusion-style multi-model consensus
- Feed raw panel outputs through a **judge model** (the default advisor)
  to produce structured analysis: consensus, contradictions, partial
  coverage, unique insights, and blind spots
- Launch a **persistent** `opencode run` session with a stronger model for
  advisor-style strategic guidance with follow-up capability
- Construct prompts that include relevant workspace context so each model
  sees what you see
- Capture auto-generated session IDs, collect and synthesize responses
  from multiple sessions into a single actionable answer
- Keep sessions alive for auditing, history, and future follow-ups

## What I won't do

- Paste raw model output to the user — always synthesize
- Call this for syntax fixes, one-liners, or boilerplate
- Treat any single model as an oracle — critically evaluate guidance
- Invent session IDs — always look up the real ID from the session list

## Prerequisites

- `opencode` CLI available on PATH
- `jq` available on PATH (for session list filtering)
- Configured providers for the models you intend to use

---

## Fusion pattern (multi-model, one-shot)

Launch 3 sessions in parallel with different models, each with the same
prompt. Collect results, synthesize.

### Default models

| Shorthand | Model |
|---|---|
| `mi` | `openrouter/xiaomi/mimo-v2.5-pro@preset/default` |
| `ds` | `openrouter/deepseek/deepseek-v4-pro@preset/default` |
| `mm` | `openrouter/minimax/minimax-m3@preset/default` |

These three models provide complementary strengths: broad knowledge
(DS), structured analysis (MM), and design/system-level thinking (MI).
All are defined in the project's `opencode.json`.

### Title naming convention

Use `--title` to label sessions, not `--session`:

```
local-fusion-<ts>-<model-shorthand>
```

Example: `local-fusion-20260708-mi`, `local-fusion-20260708-ds`,
`local-fusion-20260708-mm`

The title groups sessions from the same fusion round and makes them
searchable in `opencode session list`.

### Prompt construction

Each model session needs a self-contained prompt because it starts fresh:

```
## Goal
<what the user is trying to accomplish>

## Constraints
<language, runtime, budget, deadlines, existing stack>

## What we've already tried
<dead ends so the model doesn't re-suggest them>

## Relevant files
List file paths with line ranges for the model to read itself.
The session has full filesystem access — it can read any file.

Example:
- `src/app/views/DashboardView.tsx:97-240` — dashboard grid and quick-start card
- `src/app.css:713-717` — dashboard-grid CSS
- `handoff/prototype/CCTC Practice.dc.html:168-200` — prototype dashboard structure

Do NOT paste file contents. The model will read them.

## Shape of answer wanted
<recommendation with reasons, or trade-off table, or critique, or
ranked list of risks>
```

### Launch sequence

Launch all 3 sessions in parallel with `--title`, redirect output to temp
files:

```bash
TS=$(date +%Y%m%d-%H%M%S)
PROMPT='<your prompt text here>'

# Launch all 3 in parallel
opencode run --title "local-fusion-${TS}-mi" \
  --model "openrouter/xiaomi/mimo-v2.5-pro@preset/default" \
  "$PROMPT" > "/tmp/local-fusion-${TS}-mi.out" 2>&1 &

opencode run --title "local-fusion-${TS}-ds" \
  --model "openrouter/deepseek/deepseek-v4-pro@preset/default" \
  "$PROMPT" > "/tmp/local-fusion-${TS}-ds.out" 2>&1 &

opencode run --title "local-fusion-${TS}-mm" \
  --model "openrouter/minimax/minimax-m3@preset/default" \
  "$PROMPT" > "/tmp/local-fusion-${TS}-mm.out" 2>&1 &

# Wait for all to complete
wait

# Check which sessions completed vs timed out
for f in "/tmp/local-fusion-${TS}-"*.out; do
  echo "$(basename $f): $(wc -l < "$f") lines"
done

# If any session has < 5 lines of output, it likely timed out.
# Continue it with a shorter prompt before running the judge.

# Capture the auto-generated session IDs
SID_MI=$(opencode session list --format json --max-count 10 | \
  jq -r '.[] | select(.title == "local-fusion-'"${TS}"'-mi") | .id' | head -1)
SID_DS=$(opencode session list --format json --max-count 10 | \
  jq -r '.[] | select(.title == "local-fusion-'"${TS}"'-ds") | .id' | head -1)
SID_MM=$(opencode session list --format json --max-count 10 | \
  jq -r '.[] | select(.title == "local-fusion-'"${TS}"'-mm") | .id' | head -1)
```

**Note on `--max-count`**: `opencode session list` with `--format json`
returns sessions in recency order. `--max-count 10` limits the search
scope. If you launch many sessions between launch and lookup, increase
this value or use `--max-count` without a limit (omit the flag for all
sessions, slower for large histories).

### Collecting results and judging

After `wait` completes, feed all raw panel outputs to the advisor model
acting as a **judge**. The judge produces a structured analysis mirroring
OpenRouter Fusion's output: consensus, contradictions, partial coverage,
unique insights, and blind spots.

```bash
# Concatenate raw panel outputs
cat "/tmp/local-fusion-${TS}-mi.out" \
    "/tmp/local-fusion-${TS}-ds.out" \
    "/tmp/local-fusion-${TS}-mm.out" \
    > "/tmp/local-fusion-${TS}-all.txt"

JUDGE_TITLE="local-fusion-judge-${TS}"

opencode run --title "$JUDGE_TITLE" \
  --model "openrouter/z-ai/glm-5.2@preset/default" \
  "You are a judge. Below are responses from three independent models
to the same prompt. Analyze them and return a structured summary.

Return exactly these sections:

## Consensus
Points where 2+ models agree. These are the highest-confidence findings.

## Contradictions
Where models disagree. State both sides without picking one. If none,
say 'None.'

## Partial coverage
Points raised by only 1-2 models but not all. These may be valuable but
unverified.

## Unique insights
A specific insight from a single model that the others missed. Cite the
source model.

## Blind spots
What all models missed or failed to address. What a reader should be
aware is absent from this analysis.

---
PRIMARY QUESTION:
$(head -5 "/tmp/local-fusion-${TS}-all.txt")

PANEL RESPONSES:
$(cat "/tmp/local-fusion-${TS}-all.txt")" \
  > "/tmp/${JUDGE_TITLE}.out" 2>&1

# Capture the judge session ID
JUDGE_SID=$(opencode session list --format json --max-count 10 | \
  jq -r '.[] | select(.title == "'"$JUDGE_TITLE"'") | .id' | head -1)

echo "Judge session: $JUDGE_SID"
```

### Presenting the result

The judge's output **is** your synthesis. Present it to the user as-is
(or lightly reformatted). Do not re-interpret or editorialize it — the
judge model already performed the synthesis. Your job is delivery, not
re-analysis.

If the judge call fails (model unavailable, rate limited, timeout),
fall back to manual synthesis:

1. **Identify consensus** — where 2+ models agree
2. **Flag contradictions** — where models split, state both sides
3. **Note unique insights** — a single model's observation others missed
4. **Check blind spots** — what did all models miss? Use your own
   knowledge here
5. **Present a single structured answer**

### Clean up temp files (not sessions)

```bash
rm "/tmp/local-fusion-${TS}-"*.out
```

Never delete the sessions themselves — they persist for auditing,
history, and potential follow-ups.

### Handling timeouts and reusing sessions

Fusion sessions may timeout (especially when models read many files).
When this happens:

1. **Check if sessions are still running** before starting new ones:
   ```bash
   pgrep -f "opencode run" | wc -l
   ```

2. **Check what each session produced** — a partial output may be useful:
   ```bash
   wc -l "/tmp/local-fusion-${TS}-"*.out
   ```

3. **Reuse timed-out sessions** with `--continue` instead of starting fresh.
   The session already read the files and built context — starting over
   wastes that work:
   ```bash
   # Session timed out mid-analysis. Continue it with a shorter prompt.
   opencode run --session "$SID_MI" --continue \
     "You have already read the files. Produce your analysis now." \
     > "/tmp/local-fusion-${TS}-mi.out" 2>&1
   ```

4. **Only create new sessions if the old ones are truly dead** (process
   gone, output empty). A new session starts from scratch — no file
   context, no prior reasoning.

Never assume a timed-out session is dead. Check first, continue second,
create new last.

---

## Advisor pattern (single strong model, persistent)

Launch one session with a stronger model. Capture its session ID so you
can follow up in the same context.

### Default model

| Role | Model |
|---|---|
| Advisor | `openrouter/z-ai/glm-5.2@preset/default` |

### Initial launch

```bash
TITLE="local-advisor-$(date +%Y%m%d-%H%M%S)"

opencode run --title "$TITLE" \
  --model "openrouter/z-ai/glm-5.2@preset/default" \
  "<advisor prompt>" \
  > "/tmp/${TITLE}.out" 2>&1

# Capture the session ID
SID=$(opencode session list --format json --max-count 10 | \
  jq -r '.[] | select(.title == "'"$TITLE"'") | .id' | head -1)

echo "Advisor session: $SID (title: $TITLE)"
```

This blocks until the model responds. The output goes to stdout. The
session persists for follow-ups and auditing.

### Following up

Use the captured session ID with `--continue`:

```bash
opencode run --session "$SID" --continue \
  "But what about the edge case where X happens?" \
  > "/tmp/${TITLE}-followup.out" 2>&1
```

Use this to drill deeper: "What would you change?", "Are there security
concerns I missed?", "Give me a concrete implementation plan."

**Important**: `--continue` without `--session` (relying on "last
session") can hang indefinitely. Always pass an explicit `--session`
with the captured ID.

### Prompt structure

Same template as fusion, but be explicit about the **kind** of advice:

```
## Current state
<what you've done so far, what's working, what's not>

## What I've already tried
<specific attempts and why they failed or felt incomplete>

## What I need
<strategic guidance, blind spot check, edge case review, or decision>

## Relevant files
List file paths with line ranges for the model to read itself.
Do NOT paste file contents — the session has full filesystem access.

Example:
- `src/services/payment.ts:45-80` — payment processing logic
- `config/database.yml` — connection pool config

Be specific. If there are risks, name them. If there are alternatives,
rank them.
```

### After receiving guidance

- **Evaluate, don't obey** — cross-check against the codebase
- **Synthesize into action** — turn guidance into concrete next steps
- **Cite the source** — "Based on analysis from GLM-5.2, the likely
  cause…"
- **Follow up** if the answer is incomplete or raises new questions

---

## When to choose which tool

| Question shape | Pattern | Why |
|---|---|---|
| "What are the trade-offs between A and B?" | Fusion | Multiple models surface different angles |
| "Should I do A or B?" | Advisor | Wants a single confident recommendation |
| "Find flaws in this design." | Advisor | One sharp critic beats a committee |
| "Survey arguments for and against X." | Fusion | The diversity of responses is the value |
| "I'm stuck on this bug." | Advisor | Targeted analysis, then follow up |
| "Is this refactor safe to ship?" | Fusion | Diverse review + judge structured analysis |

If unsure, default to advisor — it's one session vs. four, and you can
always escalate to fusion later.

---

## Cost and latency

- Fusion: 3 panel sessions (parallel) + 1 judge session (sequential).
  4 total sessions, wall-clock ≈ slowest panel + judge time
- Advisor: one session, plus follow-up tokens if you continue
- Both: models have local filesystem access, so they may read files you
  didn't explicitly paste — that adds token cost but saves you from
  copying everything manually
- **Calibrate**: for a 30-second task, this is overkill. For a 4-hour
  task, the overhead is noise

---

## Anti-patterns

- **Overuse.** A typo does not need fusion. A bash one-liner does not
  need an advisor
- **Pasting raw output.** Always synthesize before presenting to the
  user
- **Too many models.** 3 is the default and the sweet spot. 5+ adds
  noise and cost without more signal
- **Vague prompts.** Same rules as OpenRouter: goal, constraints, tried,
  code, shape of answer
- **Assuming the model read your files.** The prompt should still
  summarize key context — the model may not explore the workspace
  unless explicitly instructed
- **Skipping the timestamp in title.** Without it, titles collide across
  fusion rounds, making session lookup ambiguous
- **Not using `--continue` for advisor follow-ups.** Each new
  invocation without `--continue` creates a fresh session with no context
- **Passing a made-up name to `--session`.** `--session` expects a real
  session ID (`ses_...`). Use `--title` for naming, then look up the
  ID
- **Using `--continue` without `--session`.** It can hang. Always pass
  the explicit session ID
- **Using a different model than the defaults without justification.**
  The 3 fusion panelists and 1 advisor model were chosen for
  complementary strengths. Deviate only if the task calls for a
  specific model's strengths
- **Inlining file contents into the prompt.** Sessions have full filesystem
  access. Point to files by path with line number citations. Inlining
  bloats context, costs tokens, and causes timeouts — the model should
  read the files itself.
- **Creating new sessions instead of reusing timed-out ones.** A timed-out
  session already read files and built context. Use `--continue` with the
  captured session ID to resume it. Only create new sessions if the process
  is confirmed dead.

---

## Model quick reference

| Role | Model |
|---|---|---|
| Fusion — broad knowledge, tradeoffs | `openrouter/deepseek/deepseek-v4-pro@preset/default` (DS) |
| Fusion — structured analysis | `openrouter/minimax/minimax-m3@preset/default` (MM) |
| Fusion — design/system thinking | `openrouter/xiaomi/mimo-v2.5-pro@preset/default` (MI) |
| Judge — synthesize fusion results | `openrouter/z-ai/glm-5.2@preset/default` |
| Advisor — strategic guidance | `openrouter/z-ai/glm-5.2@preset/default` |

All models are defined in the project's `opencode.json`. Use `opencode
models` to verify they are available.

---

## Example: Architecture decision (Fusion)

**User**: "Should we migrate from REST to GraphQL for our API? Rails
monolith, 50 endpoints, team of 4."

```bash
TS=$(date +%Y%m%d-%H%M%S)
PROMPT='## Goal
Decide whether migrating from REST to GraphQL makes sense for this project.

## Constraints
- Rails 7 monolith
- ~50 REST endpoints
- Team of 4 (2 backend, 2 frontend)
- No dedicated platform/infra team
- GraphQL would be added incrementally, not a rewrite

## Shape of answer
Ranked recommendation with 3-5 concrete tradeoffs, a migration risk
assessment (low/medium/high per tradeoff), and a suggested first step
if the recommendation is "yes."

## Relevant files
The workspace is at this project root. Key files to inspect:
- `config/routes.rb` — route definitions
- `app/controllers/` — existing REST controllers
- `app/graphql/` — empty, planned GraphQL location
- `Gemfile` — dependencies

Read these yourself. Do not paste contents into the prompt.'

# Launch all 3 in parallel
opencode run --title "local-fusion-${TS}-mi" \
  --model "openrouter/xiaomi/mimo-v2.5-pro@preset/default" \
  "$PROMPT" > "/tmp/local-fusion-${TS}-mi.out" 2>&1 &

opencode run --title "local-fusion-${TS}-ds" \
  --model "openrouter/deepseek/deepseek-v4-pro@preset/default" \
  "$PROMPT" > "/tmp/local-fusion-${TS}-ds.out" 2>&1 &

opencode run --title "local-fusion-${TS}-mm" \
  --model "openrouter/minimax/minimax-m3@preset/default" \
  "$PROMPT" > "/tmp/local-fusion-${TS}-mm.out" 2>&1 &

wait

# Capture session IDs for future follow-ups
SID_MI=$(opencode session list --format json --max-count 10 | \
  jq -r '.[] | select(.title == "local-fusion-'"${TS}"'-mi") | .id' | head -1)
SID_DS=$(opencode session list --format json --max-count 10 | \
  jq -r '.[] | select(.title == "local-fusion-'"${TS}"'-ds") | .id' | head -1)
SID_MM=$(opencode session list --format json --max-count 10 | \
  jq -r '.[] | select(.title == "local-fusion-'"${TS}"'-mm") | .id' | head -1)

# Feed all panel outputs to the judge for structured synthesis
cat "/tmp/local-fusion-${TS}-mi.out" \
    "/tmp/local-fusion-${TS}-ds.out" \
    "/tmp/local-fusion-${TS}-mm.out" \
    > "/tmp/local-fusion-${TS}-all.txt"

JUDGE_TITLE="local-fusion-judge-${TS}"

opencode run --title "$JUDGE_TITLE" \
  --model "openrouter/z-ai/glm-5.2@preset/default" \
  "You are a judge. Below are responses from three independent models to
the same prompt. Analyze them and return a structured summary.

Return exactly these sections:

## Consensus
Points where 2+ models agree. These are the highest-confidence findings.

## Contradictions
Where models disagree. State both sides without picking one. If none,
say 'None.'

## Partial coverage
Points raised by only 1-2 models but not all.

## Unique insights
A specific insight from a single model that the others missed. Cite the
source model.

## Blind spots
What all models missed or failed to address.

---
PANEL RESPONSES:
$(cat "/tmp/local-fusion-${TS}-all.txt")" \
  > "/tmp/${JUDGE_TITLE}.out" 2>&1

JUDGE_SID=$(opencode session list --format json --max-count 10 | \
  jq -r '.[] | select(.title == "'"$JUDGE_TITLE"'") | .id' | head -1)

# Present the judge's structured analysis to the user
echo "=== Consensus Analysis ==="
cat "/tmp/${JUDGE_TITLE}.out"
```

## Example: Bug diagnosis (Advisor)

**User**: "Intermittent `PG::ConnectionBad` in production. Connection
pool looks fine, not correlated with traffic spikes."

```bash
TITLE="local-advisor-$(date +%Y%m%d-%H%M%S)"

opencode run --title "$TITLE" \
  --model "openrouter/z-ai/glm-5.2@preset/default" \
  '## Current state
Intermittent PG::ConnectionBad errors in production Rails app. Not
correlated with traffic spikes. Connection pool config looks standard
(pool: 25, timeout: 5000). PostgreSQL is on RDS, same VPC.

## What we have already tried
- Increased pool size from 25 to 50 (no change)
- Enabled pg_stat_activity monitoring (nothing unusual during errors)
- Checked RDS metrics (connections well below max)
- Enabled statement logging (slow queries exist but not during errors)
- Verified pgbouncer is NOT in use (direct connections)

## What I need
Ranked list of likely causes (most probable first) with the diagnostic
command or config change that would confirm each one. Consider:
- PgBouncer/timeout incompatibility even though we think it is not in use
- RDS DNS resolution flapping
- Rails connection reaper interacting with idle timeouts
- Network-level issues (NAT tables, keepalive)
- prepared_statements default in Rails

## Relevant files
The workspace is at the project root. Check these files:
- `config/database.yml` — connection pool config
- `config/initializers/database.rb` — any custom database config
- `lib/patches/connection_reaper.rb` — monkey patch on ActiveRecord
- Any connection pool middleware files

Read these yourself. Do not paste contents into the prompt.' \
  > "/tmp/${TITLE}.out" 2>&1

# Capture the session ID
SID=$(opencode session list --format json --max-count 10 | \
  jq -r '.[] | select(.title == "'"$TITLE"'") | .id' | head -1)

echo "Advisor session: $SID"
tail -30 "/tmp/${TITLE}.out"

# If you need to follow up:
opencode run --session "$SID" --continue \
  "The database.yml shows prepared_statements: true. Could that cause
   this? Also, there is a monkey patch on ActiveRecord::ConnectionAdapters
   in lib/patches/connection_reaper.rb. Dig into that." \
  > "/tmp/${TITLE}-followup.out" 2>&1

tail -30 "/tmp/${TITLE}-followup.out"
```