# d2cc — computed-style diff fix (`visual` module)

**Goal:** make d2cc catch element-level *treatment* drift (card shadows, badge radius, option-letter shape, hover transforms, layout structure) that currently slips through green. Grounded in the real `src/checks/visual/index.ts` @ `main`.

## Why the current check passes while the UI drifts

The `visual` suite already extracts computed layout props from both sides (`extractLayoutProps`) and diffs them in the screenshot loop. Four reasons it catches nothing:

1. **Single selector for both sides (the killer).** `layoutSelectors` is `Record<string, string>` — one CSS selector applied to *both* prototype and implementation, and the defaults are all class-based (`.card`, `.option-button`, …). The prototype is **inline-styled with no classes**, so `document.querySelector('.card')` on the proto returns `null`; `pLayout[name]` is never populated; the comparison loop `for (const [name, pProps] of Object.entries(pLayout))` iterates an **empty object**. Silent pass.
2. **Severity defaults to `"warning"`** (`config.visual?.layoutSeverity ?? "warning"`) — mismatches never set exit code 1, so CI stays green even when they're found.
3. **Property set too narrow** — `padding, gap, borderRadius, display, flexDirection, gridTemplateColumns`. The observed drift was in `boxShadow` (card shadow), `transform` (hover lift), `backgroundColor`/`borderColor` — none are checked.
4. **Exact string equality** (`pVal !== rVal`) — no normalization, so `rgb(…)` vs `rgba(…,1)` and sub-pixel lengths will false-positive once #1 is fixed.

The fix compares **what actually renders** (computed styles of *matched* elements) instead of what's declared (tokens + class existence) — and matches proto↔impl by a shared `data-el` hook, since the two sides have entirely different class systems.

---

## Patch (find/replace in `src/checks/visual/index.ts`)

### 1. Add types + helpers (top of file, after imports)

```ts
type SelectorPair = { proto: string; impl: string };

function normalizeSelectors(
  sel: Record<string, string | SelectorPair>,
): Record<string, SelectorPair> {
  const out: Record<string, SelectorPair> = {};
  for (const [name, v] of Object.entries(sel)) {
    out[name] = typeof v === "string" ? { proto: v, impl: v } : v;
  }
  return out;
}

// Normalize a computed value so cosmetically-equal values compare equal.
function normalizeCssValue(prop: string, val: string): string {
  if (val == null || val === "N/A") return "N/A";
  let v = String(val).trim().toLowerCase();
  if (prop === "transform" && (v === "none" || v === "matrix(1, 0, 0, 1, 0, 0)")) return "none";
  if ((prop === "boxShadow" || prop === "background" || prop === "backgroundImage") && v === "none") return "none";
  v = v.replace(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/g, "rgba($1, $2, $3, 1)"); // rgb → rgba,1
  v = v.replace(/\s+/g, " ");
  return v;
}

// Compare with a small px tolerance on length values, else normalized-string equality.
function valuesMatch(prop: string, a: string, b: string, tolerancePx = 1): boolean {
  const na = normalizeCssValue(prop, a);
  const nb = normalizeCssValue(prop, b);
  if (na === nb) return true;
  if (/^[\d.]+px$/.test(na) && /^[\d.]+px$/.test(nb)) {
    return Math.abs(parseFloat(na) - parseFloat(nb)) <= tolerancePx;
  }
  return false;
}
```

### 2. Default selectors → paired, and widen properties + fail by default

Replace the `const selectors = …` / `const properties = …` / `const severity = …` block in `runVisual` with:

```ts
  const rawSelectors = config.visual?.layoutSelectors ?? {
    // proto side uses data-el hooks (prototype has no classes); impl side uses its classes
    header:        { proto: '[data-el="header"]',        impl: "header, .app-header" },
    nav:           { proto: '[data-el="nav"]',           impl: "nav, .app-header__nav" },
    card:          { proto: '[data-el="card"]',          impl: ".card, .card--panel" },
    badge:         { proto: '[data-el="badge"]',         impl: ".badge" },
    optionLetter:  { proto: '[data-el="option-letter"]', impl: ".option-letter" },
    optionButton:  { proto: '[data-el="option-button"]', impl: ".option-button" },
    quickCard:     { proto: '[data-el="quick-card"]',    impl: ".quick-card" },
    focusRow:      { proto: '[data-el="focus-row"]',     impl: ".focus-row, .domain-row" },
    primaryButton: { proto: '[data-el="btn-primary"]',   impl: ".btn-primary" },
    secondaryButton:{ proto: '[data-el="btn-secondary"]', impl: ".btn-secondary" },
  };
  const layoutPairs = normalizeSelectors(rawSelectors);
  const protoSelectors = Object.fromEntries(
    Object.entries(layoutPairs).map(([k, v]) => [k, v.proto]),
  );
  const implSelectors = Object.fromEntries(
    Object.entries(layoutPairs).map(([k, v]) => [k, v.impl]),
  );
  const properties = config.visual?.layoutProperties ?? [
    "padding", "gap", "borderRadius", "display", "flexDirection", "gridTemplateColumns",
    "boxShadow", "transform", "backgroundColor", "borderColor", "borderWidth",
    "fontSize", "fontWeight", "lineHeight",
  ];
  // Drift should FAIL the build; opt back to "warning" per-project if needed.
  const severity = config.visual?.layoutSeverity ?? "error";
```

### 3. Extract with the correct side

- Prototype capture call:
  `pLayouts[screens[i].name] = await extractLayoutProps(pPage, protoSelectors, properties);`
- React capture call:
  `const rLayout = await extractLayoutProps(rPage, implSelectors, properties);`

### 4. Use tolerant compare + fix the messages

In the comparison loop, replace the missing-element `check(...)` message selector `selectors[name]` with `layoutPairs[name].impl`, and replace:

```ts
const matches = pVal === rVal;
```
with
```ts
const matches = valuesMatch(prop, pVal, rVal);
```

(Leave the `if (pVal !== "N/A")` guard — it correctly skips props the proto element doesn't define.)

---

## Config surface (`src/core/types.ts`)

Widen the `layoutSelectors` type so pairs are allowed:

```ts
layoutSelectors?: Record<string, string | { proto: string; impl: string }>;
```

`layoutProperties`, `layoutSeverity` already exist; no change needed beyond the new default.

---

## Prototype requirement (`data-el` hooks)

Because the prototype has no classes, the contract now depends on **`data-el` markers on the canonical elements** — one representative per treatment. This is intentional: it makes "these N elements are the contract" explicit and reviewable rather than guessed. The prototype author tags them once; d2cc matches proto `[data-el="x"]` ↔ impl class. The CCTC prototype (`CCTC Practice.dc.html`) is already tagged with: `header, nav, card, badge, option-letter, option-button, quick-card, focus-row, btn-primary, btn-secondary`.

---

## `data-el` coverage reporter (do NOT auto-insert markers)

**Decision: d2cc reports missing markers; it never edits the prototype.** Auto-inserting `data-el` would make the tool mutate the source of truth and *guess* which elements are canonical — a wrong guess silently changes the contract, and the pass becomes non-idempotent. Keep the human as the one who decides what's canonical; d2cc's job is to make gaps loud.

**What the reporter does** — a non-failing (by default) check, `visual:data-el-coverage`, that runs during the prototype capture pass (the proto page is already open, so no extra browser launch):

1. For every configured `layoutPairs[name]` whose `proto` selector is a `[data-el="…"]` hook, `document.querySelector` it on the prototype page.
2. If it resolves → covered. If it returns `null` → **missing hook**: the contract names this element but the prototype has no marker for it, so that pair silently compares nothing (the exact bug this whole patch fixes — surface it instead of hiding it).
3. Also flag the inverse (advisory): `[data-el]` values present in the prototype but absent from `layoutPairs` → an untracked canonical element the author may want to add to the contract.

**Emit** one summary check plus a per-name breakdown, e.g.:

```
visual:data-el-coverage — 8/10 contract elements have a prototype [data-el] hook
  ✗ focusRow      — proto '[data-el="focus-row"]' not found (add the marker or remove the pair)
  ✗ secondaryButton — proto '[data-el="btn-secondary"]' not found
  ⓘ untracked      — [data-el="timer-pill"] exists in prototype but isn't in layoutSelectors
```

**Severity:** default `"warning"` (missing hooks are an authoring gap, not an implementation failure), but honor a config flag `visual.requireDataElCoverage: true` to promote missing-hook rows to `"error"` for teams that want the contract fully wired before merge.

**Sketch** (drop into `runVisual`, in the prototype-capture loop where `pPage` is live):

```ts
async function reportDataElCoverage(
  page: any,
  pairs: Record<string, SelectorPair>,
): Promise<{ name: string; sel: string; found: boolean }[]> {
  const wanted = Object.entries(pairs)
    .filter(([, v]) => /\[data-el=/.test(v.proto))
    .map(([name, v]) => ({ name, sel: v.proto }));
  return page.evaluate((wanted: { name: string; sel: string }[]) =>
    wanted.map((w) => ({ ...w, found: !!document.querySelector(w.sel) })), wanted);
}
```

Run it once on the first prototype screen, turn each `!found` into a `check(..., requireDataElCoverage ? "error" : "warning")`, and (optionally) collect all `[data-el]` values via `[...document.querySelectorAll('[data-el]')].map(e => e.dataset.el)` for the untracked-advisory rows.

**Why a reporter, not an auto-fixer:** the markers *are* the reviewable "these N elements are the contract" set. A tool that writes them removes the human judgment that makes the marker meaningful, and risks drifting the contract without anyone noticing. Reporting keeps the workflow deterministic and the author in control.

---

## README addition

Add under the checks/visual section:

> ### Computed-style (layout) diff
> Beyond token sync and class-existence, the `visual` check compares **computed styles of matched elements** between prototype and implementation, so element-level treatment drift is caught even when tokens are correct. Because prototypes are inline-styled (no classes), elements are matched by a shared **`data-el` hook**: tag the canonical elements in the prototype (`<div data-el="card">…`), and map them to implementation selectors in `visual.layoutSelectors` as `{ proto, impl }` pairs. Compared properties default to `padding, gap, borderRadius, display, flexDirection, gridTemplateColumns, boxShadow, transform, backgroundColor, borderColor, borderWidth, fontSize, fontWeight, lineHeight`; values are normalized (rgb↔rgba, whitespace, transform/shadow no-ops) and lengths compared with a 1px tolerance. Layout drift defaults to **severity `error`** (fails the build); set `visual.layoutSeverity: "warning"` to downgrade. This is the layer that catches card-shadow, badge-radius, option-letter-shape, and hover-transform drift that a token+class check cannot.

