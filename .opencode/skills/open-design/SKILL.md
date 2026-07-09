---
name: open-design
description: |
  Orchestrate the Open Design (OD) MCP server for design generation.
  Use when the user asks to generate, render, edit, or inspect a design
  — landing pages, dashboards, decks, mobile screens, brand images, or
  motion graphics. Triggers: "generate a landing page", "make me a
  deck", "PPT", "slides", "the design I have open", "design system",
  "Linear / Stripe / Vercel style", "Figma to React", "refresh to
  brand spec", "use open design", "what designs do I have".
  Do NOT trigger for: writing application code, editing non-design
  files, tweaking existing artifacts ("make the nav stickier"), or
  pure content changes ("update the copy in section 3").
---

# Open Design skill

MCP tool descriptions cover the contract — parameter shapes, return
types, field semantics. This skill adds **workflow orchestration** —
the order of calls, trigger rules, and anti-patterns the tool
descriptions don't teach.

## Prerequisites

- Open Design daemon must be running (desktop app or `pnpm tools-dev`)
- MCP server must be installed: `od mcp install opencode`
- If MCP calls fail silently, restart opencode after OD is up

## Two workflow paths

### Quick path — single page, no brand extraction

Use when: ≤2 pages, user names a skill or says "just make it".

1. Ask 2-3 clarifying questions (platform, audience, tone)
2. `list_skills` → `list_design_systems` if user didn't name them
3. `create_project(name, { designSystem?, skill? })`
4. `start_run(project, prompt, { skill?, agent?, model? })`
5. Poll `get_run` every 30-60s. Tell user "still working" between polls.
6. On `succeeded`: deliver `studioUrl` as a clickable link
7. Iterate with another `start_run` on the same project

### Full quality path — multi-page, brand-aware

Use when: production intent, brand consistency matters, >2 pages.

**Turn 1 — Discovery.** Ask the user:
- `output`: what are you building? (landing page, deck, dashboard...)
- `platform`: web / mobile / desktop
- `audience`: who is this for?
- `tone`: what vibe? (editorial, minimal, playful, corporate)
- `brand`: have a brand spec or URL? Or pick a direction?
- `scale`: single page vs multi-section
- `constraints`: must-haves / must-nots

Then stop. Wait for answers.

**Turn 2 — Resolve brand.**

| User said | Action |
|-----------|--------|
| Brand URL provided | `webfetch` the URL, grep CSS for hex colors, codify into tokens. **Never guess colors from memory.** |
| Named a design system | Read `od://design-systems/<id>/DESIGN.md` resource, bind tokens |
| "Pick a direction" | State your choice (editorial / minimal / brutalist / dark-glass / warm) in one sentence so user can redirect cheaply |

**Turn 3+ — Plan → build → critique → lint → deliver.**

1. `create_project` with brand tokens as part of the project context
2. For each page/section: `start_run(project, prompt)` — the daemon
   composes the full system prompt (20-50KB designer charter + brand
   tokens + skill rules) automatically
3. Poll `get_run` every 30-60s
4. On `succeeded`: deliver `studioUrl` as a clickable markdown link
5. Self-check against anti-AI-slop rules (below) — fix before saving
6. Iterate with refinement prompts on the same project

## Multi-page consistency

For projects with >1 page, establish consistency before generating:

1. `create_project` first — all `start_run` calls share the same project
2. If user provides brand: reference it in the project context so every
   generation inherits the same tokens
3. If using an OD design system: read `od://design-systems/<id>/DESIGN.md`
   and include relevant tokens in the project setup
4. Without this step, each page diverges in colors, fonts, and spacing

## Operational anti-patterns

**AP1: Cancel + `write_file` substitution.**
The #1 agent failure mode. Runs take 5-30 minutes. `status:running`
with unchanged file mtimes = inner agent thinking, not stuck. Use
`eventsLogPath` to tail live progress. Do NOT cancel and write raw
HTML — you lose the daemon's 20-50KB composed system prompt.

**AP2: Polling too fast or too slow.**
Poll every 30-60 seconds. Faster wastes CPU; slower leaves the user
waiting. Small sections take ~10s, full pages 1-5min, complex
multi-section up to 30min.

**AP3: Chaining `get_file` calls instead of `get_artifact`.**
`get_artifact` returns the entry file + all referenced siblings
(tokens CSS, JSX modules, imported assets) in one call. Multiple
`get_file` calls waste tokens and miss the file graph.

**AP4: Using `create_artifact` for iteration.**
`create_artifact` rejects existing targets (409). Use `write_file`
to update files that `create_artifact` already wrote.

**AP5: Ignoring `get_active_context`.**
User says "update the design I have open" → agent asks "which
project?" → should have called `get_active_context` first. Note
the 5-minute TTL — if stale, prompt user to switch to the OD app.

**AP6: Omitting `project` from `get_artifact` after a run.**
Active-context fallback may resolve to a different project. Pass the
`projectId` you got from `start_run` / `get_run` explicitly.

**AP7: Guessing `start_run.agent = "claude"`.**
`list_agents` returns what is actually runnable on this machine.
Guessing leaves zombie runs whose inner CLI never spawns.

**AP8: Ambiguous format requests.**
"PPT" / "deck" / "slides" / "presentation" can mean HTML deck
(browser-viewable) or `.pptx` (PowerPoint export). Ask before
generating.

**AP9: Rendering `studioUrl` as inline code.**
Always render as `[Open Design studio](url)` — clients only
navigate markdown links.

**AP10: Firing parallel `start_run`s on the same project.**
They race on the working directory. Serialize.

## Design quality anti-patterns

Audit generated HTML before presenting to the user:

- ❌ Default Tailwind indigo (`#6366f1`) as accent — the #1 AI tell
- ❌ Purple→blue gradient heroes — use flat surface + intentional type
- ❌ Emoji as feature icons (✨🚀🎯) — use monoline SVG with currentColor
- ❌ Rounded card with left-colored border accent — drop either
- ❌ "10× faster" / "99.9% uptime" invented metrics — real data or stub
- ❌ Lorem ipsum / "Feature One / Feature Two" — real copy or empty section
- ❌ Unsplash / placehold.co CDN images — use `.ph-img` placeholder class
- ❌ Hero → Features → Pricing → FAQ → CTA with no variation

## Error recovery

| Situation | Recovery |
|-----------|----------|
| `get_active_context` returns `{active: false}` | Ask user to click into a project in the OD app |
| `start_run` timeout or abort | Partial HTML may be returned with `isError: true`. Save it as checkpoint, retry with focused prompt |
| Daemon unreachable | Restart opencode after OD is up |
| `get_file` returns `[od:file-window]` marker | Re-call with `offset` = previous offset + limit to page |
| `create_artifact` returns 409 | Use `write_file` instead — the file already exists |

## Trigger matrix

| User says | First tool call | Then |
|-----------|----------------|------|
| "Generate a [landing / dashboard / mobile]" | `list_skills` → matching id | `create_project` → `start_run` |
| "Make a deck / PPT / slides" | **Ask: HTML or .pptx?** | `list_skills` for deck skill |
| "The design I have open" / "this file" | `get_active_context` | `get_artifact` |
| "Use Claude / Codex / Gemini" | `list_agents` → use returned id | pass to `start_run.agent` |
| "Apply Linear / Stripe style" | `od://design-systems/<id>/DESIGN.md` | pass to `create_project` |
| "Extend my repo from this design" | `get_artifact(project)` | mirror to local paths |
| "Delete the [X] project" | confirm with user | `delete_project(project, confirm: true)` |
| "What designs do I have?" | `list_projects` | `get_project` for details |

## Skill catalog (high-level)

- **Prototype**: web-prototype, saas-landing, dashboard, pricing-page,
  docs-page, blog-post, mobile-app
- **Deck**: guizang-ppt (magazine default), 15+ deck templates
- **Video**: hyperframes (HTML→MP4)
- **Image**: 93 prompt templates
- **Utility**: critique (5-dim self-critique), tweaks (AI panel)

## Design systems (150+)

By category: AI/LLM (claude, cohere, mistral), Dev tools (cursor,
vercel, linear-app, supabase), Fintech (stripe, coinbase, revolut),
E-commerce (shopify, airbnb, uber), Media (spotify), Automotive
(tesla, bmw), Starters (default, warm-editorial).
