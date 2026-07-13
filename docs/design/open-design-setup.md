# Open Design Setup for CCTC

## Purpose

Open Design is optional contributor tooling for CCTC redesign prototypes and
README/demo media. It is not required to install, run, test, or build the
practice-exam app.

Reusable installation and runtime instructions live with the OpenCode skill:

- [Generic setup and MCP configuration](../../.opencode/skills/open-design/references/setup.md)
- [Codespaces startup and port forwarding](../../.opencode/skills/open-design/references/codespaces.md)
- [Runtime troubleshooting](../../.opencode/skills/open-design/references/troubleshooting.md)

## CCTC Pin and Wrapper

[`open-design.lock`](open-design.lock) is the source of truth for the Open
Design repository, ref, commit, toolchain, and installation directory. The
public CCTC entry point is:

```bash
bash scripts/bootstrap-open-design.sh
```

The wrapper delegates to the skill bootstrap using this repository's lock and
defaults to an OpenCode MCP dry-run. Review the output before applying MCP
configuration. The pinned clone remains outside the repository at
`~/.cache/cctc-tools/open-design`.

New automation should use the generic script's CLI options. The wrapper still
accepts the previously documented `OD_DIR` install override and `LOCK_FILE`
lock override; an explicit CLI option takes precedence over its environment
equivalent.

## CCTC Project Requirements

Create or open an Open Design project whose workspace is the CCTC repository
root. Supply these repository-owned inputs:

- [`DESIGN.md`](../../DESIGN.md) for the current brand and UX contract.
- [`representative-cctc-items.json`](fixtures/representative-cctc-items.json)
  for realistic, non-production fixture content.
- The applicable brief or decision under `docs/design/`.
- Existing prototypes under `docs/design/artifacts/` when refining a selected
  direction.

Do not invent clinical claims, performance metrics, question content, or
product behavior. Generated work is a prototype until equivalent behavior is
implemented and validated in the application.

## Artifact Conventions

- Store review directions under `docs/design/artifacts/direction-*/`.
- Direction review artifacts use one self-contained, scrollable `index.html`
  with labeled screen sections and a screen-navigation list so reviewers can
  compare the required states consistently.
- Use a bundled standalone export only for a click-through prototype; do not
  replace the direction-review format with a routed app.
- Early sketches may live under
  `.context/vision/mockups/open-design/YYYY-MM-DD/`, but reviewed artifacts in
  `docs/design/artifacts/` take precedence.

## Media Conventions

| Output | Tool and source |
|---|---|
| README feature demos | Playwright capture of the running CCTC app |
| README hero polish | HyperFrames composition of Playwright captures |
| Redesign directions | Open Design prototypes, not production evidence |

Keep reproducible README media source, posters, and manifests under
`docs/media/readme-demos/`. Generated videos remain in its ignored `.outputs/`
directory unless the repository's media publication process explicitly moves
them elsewhere.

## Do Not Commit

- The Open Design clone or a repository-root `open-design/` directory
- Open Design caches or `.tmp` runtime state
- `docs/media/readme-demos/.outputs/`
- Temporary `*.tmp.mp4` or `*.tmp.webm` files

## Update the Pin

After verifying a new Open Design release with CCTC's design and media
workflows:

1. Update `ref` and `commit` in [`open-design.lock`](open-design.lock).
2. Update toolchain metadata only when the verified release requires it.
3. Set `last_verified` to the actual verification date.
4. Keep `install_dir` and `bootstrap_script` unchanged unless CCTC
   intentionally migrates its public installation contract.
5. Record the workflows rerun and their results in the pull request.
