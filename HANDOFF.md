# AX Development Handoff

## What Is AX

AX is 5 slash commands (`/ax:init`, `/ax:phase`, `/ax:run`, `/ax:finish`, `/ax:status`) that wrap [GSD](https://github.com/glittercowboy/get-shit-done) with testing enforcement, CI scaffolding, GitHub Flow, deployment, and Notion documentation. The commands are markdown files that Claude Code interprets as instructions.

## Repo Layout

```
skills/                    # The 5 commands (canonical source)
├── init/SKILL.md
├── phase/SKILL.md
├── run/SKILL.md
├── finish/SKILL.md
└── status/SKILL.md
references/                # Templates consumed by commands
├── ci-templates/          # GitHub Actions YAML (go, node, python, rust)
├── notion-templates/      # 8 Notion page templates
├── testing-pyramid.md
└── test-guide-template.md
scripts/
└── disable-context-monitor.js
bin/
└── cli.js                 # npx installer
test/                      # 99 tests, node --test test/*.test.js
package.json               # npm package manifest (for npx install)
.claude-plugin/            # Claude Code plugin manifest
.claude/commands/ax/       # Legacy layout (kept in sync)
.claude/ax/                # Legacy references (kept in sync)
```

## Install

```bash
npx github:shootdaj/ax --global
```

The installer (`bin/cli.js`) copies `skills/*/SKILL.md` → `~/.claude/commands/ax/*.md` and `references/` → `~/.claude/ax/references/`.

## How It Works

1. User installs with `npx github:shootdaj/ax --global`
2. User opens Claude Code in any project and runs `/ax:init`
3. Claude Code reads the markdown file and follows the instructions
4. The instructions call GSD skills (via the Skill tool) and use standard Claude Code tools

## Current State

All 5 commands are implemented and working. Key features:
- Stack auto-detection for Go, Node, Python, Rust + any-stack fallback
- Quality/speed preference (maps to GSD model profiles)
- Docker compose null safety for projects without test infra
- Thin orchestrator pattern in `/ax:run` (delegates to subagents)
- Auto-resume for interrupted runs
- GSD context monitor auto-disable
- Brownfield/existing project support (auto-detects greenfield vs brownfield)
- Conditional CI services (`{{#IF_SERVICES}}`) — no more hardcoded postgres/redis
- GitHub Flow: per-phase branches with push/PR/merge
- Auto-install all dependencies (git, gh, GSD) if missing
- Config schema validation on every command's pre-flight
- `/ax:status --quick` mode (file count check, no test execution)
- Multi-milestone history tracking across `/ax:finish` cycles
- Deployment step in `/ax:finish` — Vercel for web apps, npm/PyPI/crates for libraries, GitHub Releases for CLIs

## Future Ideas

- **Version pinning** — Track which AX version was used to init a project; warn on version mismatch
- **Partial re-init** — Allow re-running just CI or just Notion setup without full re-init
- **Custom CI providers** — Support GitLab CI, CircleCI, etc. beyond GitHub Actions
- **Test coverage tracking** — Parse coverage reports and track coverage % across phases

## Development Workflow

1. Edit files in `skills/` (canonical source)
2. Run tests: `node --test test/*.test.js`
3. Test locally: `node bin/cli.js --global` to install, then run in a test project
4. Commit and push to `shootdaj/ax`

## Key Conventions

- Step numbers in command files must be sequential and match cross-references
- All config field access uses the pattern `config.X.Y` in instructions
- GSD skills are invoked via `Skill` tool with `skill_name: "gsd:X"`
- Docker compose usage must always check for null `docker_compose_file`
- All CI templates use `{{INSTALL_COMMAND}}`, `{{LINT_COMMAND}}`, and `{{#IF_SERVICES}}` conditionals
- Config must include `milestone_history` array for multi-milestone tracking
- Config must include `deployment` object with `type`, `provider`, and `url` fields
- Deployment in finish.md runs after tests pass (Step 6), before milestone archival (Step 7)
