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

## Passing the invoking session ID

The invoking agent (you) has a session ID. Pass it to every invoked
session in the prompt so the invoked agent can read the session transcript
for additional context — the user's original request, prior consensus
rounds, code that was written, tool outputs that were verified, etc.

Capture your own session ID:
```bash
MY_SID=$(opencode session list --format json --max-count 1 | jq -r '.[0].id')
```

Then include it in the prompt to every invoked session:
```
## Invoking session context
The invoking agent's session ID is: ${MY_SID}

You may read the session transcript for additional context about what has
already been tried, what the user's original request was, and what prior
analysis rounds found. The transcript lives in the opencode SQLite database
at ~/.local/share/opencode/opencode.db.

Query the `part` table (contains user prompts, assistant responses, tool
calls, and tool outputs) filtered by session_id:
```bash
sqlite3 ~/.local/share/opencode/opencode.db \
  "SELECT data FROM part WHERE session_id='${MY_SID}' ORDER BY time_created" \
  | jq -r 'select(.type == "text") | .text' | head -100
```

For targeted queries (filter by keyword or time range):
```bash
sqlite3 ~/.local/share/opencode/opencode.db \
  "SELECT data FROM part WHERE session_id='${MY_SID}' AND data LIKE '%keyword%' ORDER BY time_created LIMIT 20"
```

Do NOT dump the entire transcript — it may have hundreds of messages.
Use targeted queries to find the context you need.
```

## What I do

- Launch **parallel** `opencode run` sessions with different models to
  simulate fusion-style multi-model consensus
- Feed raw panel outputs through a **judge model** that not only
  identifies consensus, contradictions, and blind spots but also
  **resolves** each one by reading the source code and citing evidence
- Launch a **persistent** session with a stronger model for
  advisor-style strategic guidance with follow-up capability
- Construct prompts that include relevant workspace context so each model
  sees what you see, plus the invoking session ID for transcript access
- Capture auto-generated session IDs, collect and synthesize responses
  from multiple sessions into a single actionable answer
- Keep sessions alive for auditing, history, and future follow-ups

## What I won't do

- Paste raw model output to the user — always synthesize
- Call this for syntax fixes, one-liners, or boilerplate
- Treat any single model as an oracle — critically evaluate guidance
- Invent session IDs — always look up the real ID from the session list
- Report contradictions without resolving them — the judge must read the
  source and determine which side is correct (or defer if unreachable)

## Prerequisites

- `opencode` CLI available on PATH
- `jq` available on PATH (for session list filtering)
- `sqlite3` available on PATH (for transcript queries)
- Configured providers for the panel models (opencode)
- `claude` CLI on PATH (for Sol/Fable fallback — uses subscription, not API)
- `codex` CLI on PATH (for GPT-Sol fallback — uses subscription, not API)
- Configured providers for the fallback models in `opencode.json`

---

## Judge and Advisor model fallback chain

The judge and advisor roles prefer stronger models available via
subscription CLI tools (substantially cheaper than API calls). The
fallback chain is:

| Priority | Model | CLI tool | How to invoke |
|---|---|---|---|
| 1 (preferred) | GPT-5.6-Sol | `codex` | `codex exec -m gpt-5.6-sol "<prompt>"` |
| 2 (fallback) | Claude Fable | `claude` | `claude -p --model fable --output-format json "<prompt>"` (prompt via stdin: `echo "<prompt>" \| claude -p --model fable`) |
| 3 (last resort) | GLM-5.2 | `opencode` | `opencode run --model "openrouter/z-ai/glm-5.2@preset/default" "<prompt>"` |

### How to choose which tier to use

1. **Try Sol first** (`codex exec -m gpt-5.6-sol`). If it succeeds, use
   its output.
2. **If Sol fails** (CLI not found, model unavailable, timeout, error),
   fall back to **Fable** (`claude -p --model fable`). If it succeeds,
   use its output.
3. **If both fail**, fall back to **GLM-5.2** via `opencode run`.
4. **If all three fail**, perform manual synthesis (see fallback section
   below).

### Sol invocation (preferred judge/advisor)

```bash
# One-shot (judge pattern)
timeout 300 codex exec -m gpt-5.6-sol --json "$(cat /tmp/judge-prompt.txt)" \
  > /tmp/local-fusion-judge.out 2>&1

# Parse JSON output — the answer is in item.completed events
# The thread_id (for resume) is in thread.started events

# Follow-up (advisor pattern)
THREAD_ID=$(grep '"thread.started"' /tmp/local-fusion-judge.out | \
  jq -r '.thread_id')
timeout 300 codex exec resume "$THREAD_ID" --json "Follow-up question" \
  > /tmp/local-fusion-judge-followup.out 2>&1
```

**Sol output format**: NDJSON stream. Parse with `jq`:
```bash
# Extract the model's text response
grep '"item.completed"' /tmp/local-fusion-judge.out | \
  jq -r '.item.text' 2>/dev/null

# Extract the thread/session ID for resume
grep '"thread.started"' /tmp/local-fusion-judge.out | \
  jq -r '.thread_id' 2>/dev/null
```

### Fable invocation (fallback judge/advisor)

```bash
# One-shot (judge pattern) — prompt via stdin
cat /tmp/judge-prompt.txt | timeout 300 claude -p --model fable \
  --output-format json --dangerously-skip-permissions \
  > /tmp/local-fusion-judge.out 2>&1

# Parse JSON output
RESULT=$(jq -r '.result' /tmp/local-fusion-judge.out)
SESSION_ID=$(jq -r '.session_id' /tmp/local-fusion-judge.out)

# Follow-up (advisor pattern)
echo "Follow-up question" | timeout 300 claude -p --model fable \
  --output-format json --dangerously-skip-permissions \
  -r "$SESSION_ID" \
  > /tmp/local-fusion-judge-followup.out 2>&1
```

**Fable output format**: Single JSON object with `result` (text) and
`session_id` (for `-r` resume).

### GLM invocation (last resort judge/advisor)

```bash
# One-shot (judge pattern)
opencode run --title "local-fusion-judge-${TS}" \
  --model "openrouter/z-ai/glm-5.2@preset/default" \
  "$(cat /tmp/judge-prompt.txt)" \
  > "/tmp/local-fusion-judge-${TS}.out" 2>&1

# Follow-up (advisor pattern)
JUDGE_SID=$(opencode session list --format json --max-count 10 | \
  jq -r '.[] | select(.title == "local-fusion-judge-'"${TS}"'") | .id' | head -1)
opencode run --session "$JUDGE_SID" --continue "Follow-up question" \
  > "/tmp/local-fusion-judge-${TS}-followup.out" 2>&1
```

### Detecting which tier succeeded

```bash
# After attempting Sol, check if it produced valid output
SOL_TEXT=$(grep '"item.completed"' /tmp/local-fusion-judge.out 2>/dev/null | \
  jq -r '.item.text' 2>/dev/null | head -1)
if [ -n "$SOL_TEXT" ] && [ "$SOL_TEXT" != "null" ]; then
  JUDGE_OUTPUT="$SOL_TEXT"
  JUDGE_ENGINE="sol"
else
  # Try Fable
  cat /tmp/judge-prompt.txt | timeout 300 claude -p --model fable \
    --output-format json --dangerously-skip-permissions \
    > /tmp/local-fusion-judge.out 2>&1
  FABLE_RESULT=$(jq -r '.result // empty' /tmp/local-fusion-judge.out 2>/dev/null)
  if [ -n "$FABLE_RESULT" ]; then
    JUDGE_OUTPUT="$FABLE_RESULT"
    JUDGE_ENGINE="fable"
    FABLE_SESSION=$(jq -r '.session_id // empty' /tmp/local-fusion-judge.out 2>/dev/null)
  else
    # Fall back to GLM
    # ... opencode run invocation as above ...
    JUDGE_ENGINE="glm"
  fi
fi
```

---

## Fusion pattern (multi-model, one-shot)

Launch 3 sessions in parallel with different models, each with the same
prompt. Collect results, run a two-phase judge that resolves contradictions
and blind spots.

### Default panel models

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

### Prompt construction

Each model session needs a self-contained prompt because it starts fresh.
Always include the invoking session ID so the model can read the transcript.

```
## Goal
<what the user is trying to accomplish>

## Constraints
<language, runtime, budget, deadlines, existing stack>

## What we've already tried
<dead ends so the model doesn't re-suggest them>

## Invoking session context
The invoking agent's session ID is: ${MY_SID}

You may read the session transcript for additional context about what has
already been tried, what the user's original request was, and what prior
analysis rounds found. The transcript lives in the opencode SQLite database
at ~/.local/share/opencode/opencode.db.

Query the `part` table (contains user prompts, assistant responses, tool
calls, and tool outputs) filtered by session_id:
```bash
sqlite3 ~/.local/share/opencode/opencode.db \
  "SELECT data FROM part WHERE session_id='${MY_SID}' ORDER BY time_created" \
  | jq -r 'select(.type == "text") | .text' | head -100
```

For targeted queries (filter by keyword or time range):
```bash
sqlite3 ~/.local/share/opencode/opencode.db \
  "SELECT data FROM part WHERE session_id='${MY_SID}' AND data LIKE '%keyword%' ORDER BY time_created LIMIT 20"
```

Do NOT dump the entire transcript — it may have hundreds of messages.
Use targeted queries to find the context you need.

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
MY_SID=$(opencode session list --format json --max-count 1 | jq -r '.[0].id')
PROMPT='<your prompt text here — includes $MY_SID for transcript access>'

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

### Collecting results and running the two-phase judge

After `wait` completes, feed all raw panel outputs to the judge. The
judge runs in **two phases**: analysis (identify consensus, contradictions,
blind spots) then **remediation** (resolve each contradiction and blind
spot by reading the source code, citing evidence, and deferring
unreachable edge cases).

#### Phase 1 + 2 combined judge prompt

Write the judge prompt to a temp file, then invoke via the fallback chain:

```bash
# Concatenate raw panel outputs
cat "/tmp/local-fusion-${TS}-mi.out" \
    "/tmp/local-fusion-${TS}-ds.out" \
    "/tmp/local-fusion-${TS}-mm.out" \
    > "/tmp/local-fusion-${TS}-all.txt"

# Write the two-phase judge prompt to a file
cat > /tmp/judge-prompt.txt << JUDGE_EOF
You are a judge. Below are responses from three independent models (MI, DS, MM)
to the same prompt. You have full filesystem access. Your job has two phases.

## Phase 1: Analysis

Analyze the responses and identify:

### Consensus
Points where 2+ models agree. These are the highest-confidence findings.

### Contradictions
Where models disagree. List each contradiction with both sides.

### Partial coverage
Points raised by only 1-2 models but not all.

### Unique insights
A specific insight from a single model that the others missed. Cite the source.

### Blind spots
What all models missed or failed to address.

## Phase 2: Remediation

For EACH contradiction and blind spot identified in Phase 1:

1. Read the relevant source files yourself (you have filesystem access).
2. Determine which side is correct by citing specific evidence (file:line).
3. If the issue is an unreachable edge case (the user cannot realistically
   hit it in normal use), DEFER it with a one-line justification.
4. If you cannot resolve it from source alone, say "UNRESOLVED — requires
   runtime verification" and explain what would settle it.

Do NOT leave contradictions unresolved. The user should not have to do a
separate research pass. If you can read the code and determine the answer,
do so.

## Final output format

Return exactly these sections:

## Consensus
<bullets>

## Contradictions (resolved)
For each: what the models said → what the code says → verdict (which was
correct, with file:line citation). Mark deferred items as "DEFERRED:
<reason>".

## Partial coverage
<bullets>

## Unique insights
<bullets with source model>

## Blind spots (resolved)
For each: what was missed → what the code says → whether it matters.
Mark unreachable edge cases as "DEFERRED: <reason>".

## Prioritized action list
Rank all identified issues by severity (critical first), with a one-line
fix recommendation for each. Exclude deferred items.

## Overall assessment
How well does the implementation match the target? Are there critical
issues remaining or is it production-ready?

---
PANEL RESPONSES:
$(cat "/tmp/local-fusion-${TS}-all.txt")
JUDGE_EOF

# Invoke the judge via the fallback chain (Sol → Fable → GLM)
# Try Sol first
timeout 300 codex exec -m gpt-5.6-sol --json "$(cat /tmp/judge-prompt.txt)" \
  > /tmp/local-fusion-judge.out 2>&1

SOL_TEXT=$(grep '"item.completed"' /tmp/local-fusion-judge.out 2>/dev/null | \
  jq -r '.item.text' 2>/dev/null)

if [ -n "$SOL_TEXT" ] && [ "$SOL_TEXT" != "null" ]; then
  JUDGE_OUTPUT="$SOL_TEXT"
  JUDGE_ENGINE="sol"
  JUDGE_SESSION=$(grep '"thread.started"' /tmp/local-fusion-judge.out | \
    jq -r '.thread_id' 2>/dev/null)
else
  # Try Fable
  cat /tmp/judge-prompt.txt | timeout 300 claude -p --model fable \
    --output-format json --dangerously-skip-permissions \
    > /tmp/local-fusion-judge.out 2>&1

  FABLE_RESULT=$(jq -r '.result // empty' /tmp/local-fusion-judge.out 2>/dev/null)

  if [ -n "$FABLE_RESULT" ]; then
    JUDGE_OUTPUT="$FABLE_RESULT"
    JUDGE_ENGINE="fable"
    JUDGE_SESSION=$(jq -r '.session_id // empty' /tmp/local-fusion-judge.out 2>/dev/null)
  else
    # Fall back to GLM via opencode
    JUDGE_TITLE="local-fusion-judge-${TS}"
    opencode run --title "$JUDGE_TITLE" \
      --model "openrouter/z-ai/glm-5.2@preset/default" \
      "$(cat /tmp/judge-prompt.txt)" \
      > "/tmp/${JUDGE_TITLE}.out" 2>&1

    JUDGE_OUTPUT=$(cat "/tmp/${JUDGE_TITLE}.out")
    JUDGE_ENGINE="glm"
    JUDGE_SESSION=$(opencode session list --format json --max-count 10 | \
      jq -r '.[] | select(.title == "'"$JUDGE_TITLE"'") | .id' | head -1)
  fi
fi

echo "Judge engine: $JUDGE_ENGINE"
echo "Judge session: $JUDGE_SESSION"
echo "$JUDGE_OUTPUT"
```

### Presenting the result

The judge's output **is** your synthesis. Present it to the user as-is
(or lightly reformatted). The judge has already resolved contradictions
and blind spots — you do not need to do a separate research pass.

If the judge call fails on all three tiers (Sol, Fable, GLM), fall back
to manual synthesis:

1. **Identify consensus** — where 2+ models agree
2. **Resolve contradictions yourself** — read the source code, cite
   evidence, defer unreachable edge cases
3. **Note unique insights** — a single model's observation others missed
4. **Check blind spots** — what did all models miss? Read the code
5. **Present a single structured answer** with resolved contradictions

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

Launch one session with a stronger model via the fallback chain. Capture
its session ID so you can follow up in the same context.

### Model fallback chain

Same chain as the judge: Sol → Fable → GLM. See the fallback section
above for invocation details.

### Initial launch (Sol preferred)

```bash
MY_SID=$(opencode session list --format json --max-count 1 | jq -r '.[0].id')
TITLE="local-advisor-$(date +%Y%m%d-%H%M%S)"

# Write advisor prompt to file
cat > /tmp/advisor-prompt.txt << ADVISOR_EOF
## Current state
<what you've done so far, what's working, what's not>

## What I've already tried
<specific attempts and why they failed or felt incomplete>

## What I need
<strategic guidance, blind spot check, edge case review, or decision>

## Invoking session context
The invoking agent's session ID is: ${MY_SID}

You may read the session transcript for additional context. The transcript
lives in the opencode SQLite database at ~/.local/share/opencode/opencode.db.
Query the \`part\` table filtered by session_id:
\`\`\`bash
sqlite3 ~/.local/share/opencode/opencode.db \
  "SELECT data FROM part WHERE session_id='${MY_SID}' ORDER BY time_created" \
  | jq -r 'select(.type == "text") | .text' | head -100
\`\`\`
Use targeted queries — do NOT dump the entire transcript.

## Relevant files
List file paths with line ranges for the model to read itself.
Do NOT paste file contents — the session has full filesystem access.

Be specific. If there are risks, name them. If there are alternatives,
rank them.
ADVISOR_EOF

# Try Sol first
timeout 300 codex exec -m gpt-5.6-sol --json "$(cat /tmp/advisor-prompt.txt)" \
  > "/tmp/${TITLE}.out" 2>&1

SOL_TEXT=$(grep '"item.completed"' "/tmp/${TITLE}.out" 2>/dev/null | \
  jq -r '.item.text' 2>/dev/null)

if [ -n "$SOL_TEXT" ] && [ "$SOL_TEXT" != "null" ]; then
  ADVISOR_OUTPUT="$SOL_TEXT"
  ADVISOR_ENGINE="sol"
  ADVISOR_SESSION=$(grep '"thread.started"' "/tmp/${TITLE}.out" | \
    jq -r '.thread_id' 2>/dev/null)
else
  # Try Fable
  cat /tmp/advisor-prompt.txt | timeout 300 claude -p --model fable \
    --output-format json --dangerously-skip-permissions \
    > "/tmp/${TITLE}.out" 2>&1

  FABLE_RESULT=$(jq -r '.result // empty' "/tmp/${TITLE}.out" 2>/dev/null)

  if [ -n "$FABLE_RESULT" ]; then
    ADVISOR_OUTPUT="$FABLE_RESULT"
    ADVISOR_ENGINE="fable"
    ADVISOR_SESSION=$(jq -r '.session_id // empty' "/tmp/${TITLE}.out" 2>/dev/null)
  else
    # Fall back to GLM
    opencode run --title "$TITLE" \
      --model "openrouter/z-ai/glm-5.2@preset/default" \
      "$(cat /tmp/advisor-prompt.txt)" \
      > "/tmp/${TITLE}.out" 2>&1

    ADVISOR_OUTPUT=$(cat "/tmp/${TITLE}.out")
    ADVISOR_ENGINE="glm"
    ADVISOR_SESSION=$(opencode session list --format json --max-count 10 | \
      jq -r '.[] | select(.title == "'"$TITLE"'") | .id' | head -1)
  fi
fi

echo "Advisor engine: $ADVISOR_ENGINE"
echo "Advisor session: $ADVISOR_SESSION (engine: $ADVISOR_ENGINE)"
echo "$ADVISOR_OUTPUT"
```

### Following up

Use the captured session ID with the appropriate CLI's resume command:

```bash
# Sol follow-up
timeout 300 codex exec resume "$ADVISOR_SESSION" --json "But what about the edge case where X happens?" \
  > "/tmp/${TITLE}-followup.out" 2>&1

# Fable follow-up
echo "But what about the edge case where X happens?" | timeout 300 claude -p \
  --model fable --output-format json --dangerously-skip-permissions \
  -r "$ADVISOR_SESSION" \
  > "/tmp/${TITLE}-followup.out" 2>&1

# GLM follow-up
opencode run --session "$ADVISOR_SESSION" --continue \
  "But what about the edge case where X happens?" \
  > "/tmp/${TITLE}-followup.out" 2>&1
```

Use this to drill deeper: "What would you change?", "Are there security
concerns I missed?", "Give me a concrete implementation plan."

### Prompt structure

Same template as fusion, but be explicit about the **kind** of advice:

```
## Current state
<what you've done so far, what's working, what's not>

## What I've already tried
<specific attempts and why they failed or felt incomplete>

## What I need
<strategic guidance, blind spot check, edge case review, or decision>

## Invoking session context
<session ID + transcript query instructions>

## Relevant files
List file paths with line ranges for the model to read itself.
Do NOT paste file contents — the session has full filesystem access.

Be specific. If there are risks, name them. If there are alternatives,
rank them.
```

### After receiving guidance

- **Evaluate, don't obey** — cross-check against the codebase
- **Synthesize into action** — turn guidance into concrete next steps
- **Cite the source** — "Based on analysis from [Sol/Fable/GLM]…"
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
| "Is this refactor safe to ship?" | Fusion | Diverse review + judge resolves contradictions |

If unsure, default to advisor — it's one session vs. four, and you can
always escalate to fusion later.

---

## Cost and latency

- Fusion: 3 panel sessions (parallel, via opencode) + 1 judge session
  (sequential, via Sol/Fable/GLM fallback chain). 4 total sessions,
  wall-clock ≈ slowest panel + judge time
- Advisor: one session via fallback chain, plus follow-up tokens if you
  continue
- **Subscription CLI cost**: Sol and Fable run via `codex` and `claude`
  CLIs respectively, which use your existing subscription — substantially
  cheaper than API per-call pricing. GLM runs via `opencode run` which
  uses the configured OpenRouter provider.
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
- **Not using `--continue` / `resume` for advisor follow-ups.** Each new
  invocation without continuation creates a fresh session with no context
- **Passing a made-up name to `--session`.** `--session` expects a real
  session ID (`ses_...`). Use `--title` for naming, then look up the
  ID
- **Using `--continue` without `--session`.** It can hang. Always pass
  the explicit session ID
- **Using a different model than the defaults without justification.**
  The 3 fusion panelists and the fallback chain were chosen for
  complementary strengths and cost efficiency. Deviate only if the task
  calls for a specific model's strengths
- **Inlining file contents into the prompt.** Sessions have full filesystem
  access. Point to files by path with line number citations. Inlining
  bloats context, costs tokens, and causes timeouts — the model should
  read the files itself.
- **Creating new sessions instead of reusing timed-out ones.** A timed-out
  session already read files and built context. Use `--continue` with the
  captured session ID to resume it. Only create new sessions if the process
  is confirmed dead.
- **Reporting contradictions without resolving them.** The judge must
  read the source code and resolve each contradiction by citing evidence.
  Do not leave the user with "Model A said X, Model B said Y" — determine
  which is correct. Defer only unreachable edge cases with justification.
- **Not passing the invoking session ID.** Invoked agents start fresh
  with no context. Pass your session ID so they can read the transcript
  for prior attempts, user requests, and code changes.
- **Dumping the entire transcript.** The transcript may have hundreds
  of messages. Use targeted SQLite queries with keyword filters or time
  ranges to extract only the relevant context.

---

## Model quick reference

| Role | Model | CLI tool | Notes |
|---|---|---|---|
| Fusion — broad knowledge, tradeoffs | `openrouter/deepseek/deepseek-v4-pro@preset/default` (DS) | `opencode run` | Panelist |
| Fusion — structured analysis | `openrouter/minimax/minimax-m3@preset/default` (MM) | `opencode run` | Panelist |
| Fusion — design/system thinking | `openrouter/xiaomi/mimo-v2.5-pro@preset/default` (MI) | `opencode run` | Panelist |
| Judge/Advisor — preferred | GPT-5.6-Sol | `codex exec` | Subscription, cheapest |
| Judge/Advisor — fallback 1 | Claude Fable | `claude -p` | Subscription, cheap |
| Judge/Advisor — fallback 2 | GLM-5.2 | `opencode run` | API, last resort |

Panel models are defined in the project's `opencode.json`. Judge/advisor
models use the fallback chain (Sol → Fable → GLM). Use `opencode models`
to verify opencode providers; use `codex --version` and `claude --version`
to verify CLI availability.

---

## Example: Architecture decision (Fusion)

**User**: "Should we migrate from REST to GraphQL for our API? Rails
monolith, 50 endpoints, team of 4."

```bash
TS=$(date +%Y%m%d-%H%M%S)
MY_SID=$(opencode session list --format json --max-count 1 | jq -r '.[0].id')
PROMPT="## Goal
Decide whether migrating from REST to GraphQL makes sense for this project.

## Constraints
- Rails 7 monolith
- ~50 REST endpoints
- Team of 4 (2 backend, 2 frontend)
- No dedicated platform/infra team
- GraphQL would be added incrementally, not a rewrite

## Invoking session context
The invoking agent's session ID is: ${MY_SID}

You may read the session transcript for additional context. The transcript
lives in the opencode SQLite database at ~/.local/share/opencode/opencode.db.
Query the \`part\` table filtered by session_id:
\`\`\`bash
sqlite3 ~/.local/share/opencode/opencode.db \\
  \"SELECT data FROM part WHERE session_id='${MY_SID}' ORDER BY time_created\" \\
  | jq -r 'select(.type == \"text\") | .text' | head -100
\`\`\`
Use targeted queries — do NOT dump the entire transcript.

## Shape of answer
Ranked recommendation with 3-5 concrete tradeoffs, a migration risk
assessment (low/medium/high per tradeoff), and a suggested first step
if the recommendation is \"yes.\"

## Relevant files
The workspace is at this project root. Key files to inspect:
- \`config/routes.rb\` — route definitions
- \`app/controllers/\` — existing REST controllers
- \`app/graphql/\` — empty, planned GraphQL location
- \`Gemfile\` — dependencies

Read these yourself. Do not paste contents into the prompt."

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

# Concatenate and run the two-phase judge via fallback chain
cat "/tmp/local-fusion-${TS}-mi.out" \
    "/tmp/local-fusion-${TS}-ds.out" \
    "/tmp/local-fusion-${TS}-mm.out" \
    > "/tmp/local-fusion-${TS}-all.txt"

# Write judge prompt (see the two-phase template above)
# ... write to /tmp/judge-prompt.txt ...

# Try Sol first, then Fable, then GLM (see fallback chain section)
# ...

# Present the judge's structured analysis to the user
echo "=== Consensus Analysis ==="
echo "$JUDGE_OUTPUT"
```

## Example: Bug diagnosis (Advisor)

**User**: "Intermittent `PG::ConnectionBad` in production. Connection
pool looks fine, not correlated with traffic spikes."

```bash
MY_SID=$(opencode session list --format json --max-count 1 | jq -r '.[0].id')
TITLE="local-advisor-$(date +%Y%m%d-%H%M%S)"

# Write advisor prompt to file
cat > /tmp/advisor-prompt.txt << ADVISOR_EOF
## Current state
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
command or config change that would confirm each one.

## Invoking session context
The invoking agent's session ID is: ${MY_SID}

You may read the session transcript for additional context. The transcript
lives in the opencode SQLite database at ~/.local/share/opencode/opencode.db.
Query the \`part\` table filtered by session_id:
\`\`\`bash
sqlite3 ~/.local/share/opencode/opencode.db \\
  \"SELECT data FROM part WHERE session_id='${MY_SID}' ORDER BY time_created\" \\
  | jq -r 'select(.type == \"text\") | .text' | head -100
\`\`\`
Use targeted queries — do NOT dump the entire transcript.

## Relevant files
The workspace is at the project root. Check these files:
- \`config/database.yml\` — connection pool config
- \`config/initializers/database.rb\` — any custom database config
- \`lib/patches/connection_reaper.rb\` — monkey patch on ActiveRecord

Read these yourself. Do not paste contents into the prompt.
ADVISOR_EOF

# Invoke via fallback chain (Sol → Fable → GLM)
# ... see advisor launch section above ...

echo "Advisor session: $ADVISOR_SESSION (engine: $ADVISOR_ENGINE)"
echo "$ADVISOR_OUTPUT"

# Follow-up (engine-specific resume command):
# Sol: codex exec resume "$ADVISOR_SESSION" --json "Dig into the monkey patch"
# Fable: echo "Dig into the monkey patch" | claude -p --model fable -r "$ADVISOR_SESSION"
# GLM: opencode run --session "$ADVISOR_SESSION" --continue "Dig into the monkey patch"
```
