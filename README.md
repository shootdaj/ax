# AX

Custom Development Workflow Layer for [GSD](https://github.com/glittercowboy/get-shit-done). Automates testing pyramid enforcement, CI scaffolding, GitHub Flow setup, and Notion documentation across the entire project lifecycle.

## What It Does

AX wraps GSD's planning and execution engine with:
- **Testing pyramid** — unit, integration, and scenario tests enforced on every phase
- **CI scaffolding** — GitHub Actions workflows generated from stack-specific templates
- **GitHub Flow** — branch protection, phase branches, PR-based merges
- **Notion docs** — 8-page documentation tree auto-updated after every phase

## Commands

| Command | What it does |
|---|---|
| `/ax:init` | One-time project setup: GSD init + CI + testing + Notion + branch protection |
| `/ax:phase N` | Run a single phase end-to-end: plan → execute → test → verify → document |
| `/ax:run` | Autopilot: run all remaining phases, then finish the milestone |
| `/ax:finish [version]` | Complete milestone: audit → gaps → tag → final docs |
| `/ax:status` | Quick overview: progress + test health + CI status + doc freshness |

## Install

**Requires:** [GSD](https://github.com/glittercowboy/get-shit-done) installed globally (`npx get-shit-done-cc --claude --global`)

### One-Line Install (recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/shootdaj/ax/main/install.sh | bash
```

This installs AX commands globally to `~/.claude/`, making `/ax:*` available in every project.

### Update

Run the same install command — it overwrites existing files with the latest version.

### Manual Install

```bash
git clone https://github.com/shootdaj/ax.git /tmp/ax-install
cp -r /tmp/ax-install/.claude/commands/ax/ ~/.claude/commands/ax/
cp -r /tmp/ax-install/.claude/ax/ ~/.claude/ax/
rm -rf /tmp/ax-install
```

### Uninstall

```bash
rm -rf ~/.claude/commands/ax ~/.claude/ax
```

### Usage

Open Claude Code in any project and run `/ax:init`.

## Design Principles

- **Minimal commands, maximum automation** — 5 commands cover the entire lifecycle
- **Only pause for humans** — manual account creation, payments, auth gates. Everything else is automated.
- **Questions at phase boundaries** — `/ax:run` asks for external setup just-in-time, not upfront
- **Test everything** — testing requirements injected into CLAUDE.md so GSD agents naturally include tests
- **One-way Notion push** — docs updated after every phase, synthesized at milestone completion

## Stack Support

CI templates and test scaffolding for:
- Go
- Node.js (npm, yarn, pnpm, bun)
- Python
- Rust

## File Structure

```
.claude/
├── ax/
│   ├── config.json                      # Per-project config (created by /ax:init)
│   └── references/
│       ├── testing-pyramid.md           # Testing methodology
│       ├── test-guide-template.md       # TEST_GUIDE.md template
│       ├── ci-templates/
│       │   ├── go.yml
│       │   ├── node.yml
│       │   ├── python.yml
│       │   └── rust.yml
│       └── notion-templates/
│           ├── architecture.md
│           ├── data-flow.md
│           ├── api-reference.md
│           ├── component-index.md
│           ├── adr.md
│           ├── deployment.md
│           ├── dev-workflow.md
│           └── phase-report.md
└── commands/ax/
    ├── init.md                          # /ax:init
    ├── phase.md                         # /ax:phase
    ├── run.md                           # /ax:run
    ├── finish.md                        # /ax:finish
    └── status.md                        # /ax:status
```
