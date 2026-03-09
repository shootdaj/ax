# AX

Full project lifecycle for [Claude Code](https://docs.anthropic.com/en/docs/claude-code). Wraps [GSD](https://github.com/glittercowboy/get-shit-done) with testing enforcement, CI scaffolding, GitHub Flow, deployment, and Notion docs.

## What It Does

- **Testing pyramid** — unit, integration, and scenario tests enforced on every phase
- **CI scaffolding** — GitHub Actions workflows generated from stack-specific templates (Go, Node, Python, Rust)
- **GitHub Flow** — branch protection, per-phase branches, PR-based merges
- **Deployment** — auto-detected per project type (Vercel, npm, PyPI, crates.io, GitHub Releases, Docker)
- **Notion docs** — 8-page documentation tree auto-updated after every phase

## Commands

| Command | What it does |
|---|---|
| `/ax:init` | Project setup: GSD init + CI + testing + deployment + Notion + branch protection |
| `/ax:phase N` | Run a single phase: plan → execute → test → verify → document |
| `/ax:run` | Autopilot: run all remaining phases, then finish the milestone |
| `/ax:finish [version]` | Complete milestone: audit → gaps → deploy → tag → final docs |
| `/ax:status` | Quick overview: progress + test health + CI status + doc freshness |

## Install

**Requires:** [GSD](https://github.com/glittercowboy/get-shit-done) installed globally (`npx get-shit-done-cc --claude --global`)

```bash
npx github:shootdaj/ax --global
```

That's it. This installs `/ax:*` commands globally to `~/.claude/`.

### Update

```bash
npx github:shootdaj/ax@main --global
```

### Uninstall

```bash
npx github:shootdaj/ax --global --uninstall
```

### Project-Local Install

```bash
npx github:shootdaj/ax --local
```

Installs to `./.claude/` in the current project only.

## Usage

Open Claude Code in any project and run `/ax:init`. Works for both new and existing projects — AX auto-detects which mode to use.

## Stack Support

CI templates and test scaffolding for:
- Go
- Node.js (npm, yarn, pnpm, bun)
- Python
- Rust
