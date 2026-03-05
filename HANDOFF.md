# AX Development Handoff

## What Is AX

AX is 5 slash commands (`/ax:init`, `/ax:phase`, `/ax:run`, `/ax:finish`, `/ax:status`) that wrap [GSD](https://github.com/glittercowboy/get-shit-done) with testing enforcement, CI scaffolding, GitHub Flow, and Notion documentation. The commands are markdown files that Claude Code interprets as instructions.

## Repo Layout

Everything lives under `.claude/`:
- **`.claude/commands/ax/*.md`** — the 5 slash commands (the core product)
- **`.claude/ax/references/`** — templates and CI configs consumed by the commands
- **`.claude/ax/disable-context-monitor.js`** — utility script
- **`README.md`** — user-facing docs

There is no build step, no package.json, no compiled code. The "code" is markdown instructions + YAML templates + one small JS utility.

## How It Works

1. User installs by copying `.claude/commands/ax/` and `.claude/ax/` to `~/.claude/`
2. User opens Claude Code in any project and runs `/ax:init`
3. Claude Code reads the markdown file and follows the instructions
4. The instructions call GSD skills (via the Skill tool) and use standard Claude Code tools

## Current State

All 5 commands are implemented and working. All known gaps have been addressed. Key features:
- Stack auto-detection for Go, Node, Python, Rust + any-stack fallback
- Quality/speed preference (maps to GSD model profiles)
- Docker compose null safety for projects without test infra
- Thin orchestrator pattern in `/ax:run` (delegates to subagents)
- Auto-resume for interrupted runs
- GSD context monitor auto-disable
- Install script (`install.sh`) with one-liner curl install, update, and uninstall
- Brownfield/existing project support (auto-detects greenfield vs brownfield)
- Conditional CI services (`{{#IF_SERVICES}}`) — no more hardcoded postgres/redis
- GitHub Flow: per-phase branches with push/PR/merge
- Auto-install all dependencies (git, gh, GSD) if missing
- Config schema validation on every command's pre-flight
- `/ax:status --quick` mode (file count check, no test execution)
- Multi-milestone history tracking across `/ax:finish` cycles

## Future Ideas

These are lower-priority improvements, not blocking usage:

- **Version pinning** — Track which AX version was used to init a project; warn on version mismatch
- **Partial re-init** — Allow re-running just CI or just Notion setup without full re-init
- **Custom CI providers** — Support GitLab CI, CircleCI, etc. beyond GitHub Actions
- **Test coverage tracking** — Parse coverage reports and track coverage % across phases

## Development Workflow

1. Edit files in this repo
2. Test by copying to `~/.claude/commands/ax/` and `~/.claude/ax/` and running in a test project
3. Commit and push to `shootdaj/ax`

## Key Conventions

- Step numbers in command files must be sequential and match cross-references
- All config field access uses the pattern `config.X.Y` in instructions
- GSD skills are invoked via `Skill` tool with `skill_name: "gsd:X"`
- Docker compose usage must always check for null `docker_compose_file`
- All CI templates use `{{INSTALL_COMMAND}}`, `{{LINT_COMMAND}}`, and `{{#IF_SERVICES}}` conditionals
- Config must include `milestone_history` array (added in v0.3.0) for multi-milestone tracking
