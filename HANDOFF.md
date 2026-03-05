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

All 5 commands are implemented and working. v0.2.0 just released. Key things done:
- Stack auto-detection for Go, Node, Python, Rust + any-stack fallback
- Quality/speed preference (maps to GSD model profiles)
- Docker compose null safety for projects without test infra
- Thin orchestrator pattern in `/ax:run` (delegates to subagents)
- Auto-resume for interrupted runs
- GSD context monitor auto-disable

## Known Gaps / Future Work

These are the main areas that need attention:

### 1. Install Script
Currently install is manual `cp` commands. Should have a proper install script (`install.sh`) or an npx-based installer. The README shows the manual steps — automate them.

### 2. Uninstall / Update
No way to update AX after install. No uninstall command. Need at minimum:
- `ax-update.sh` that pulls latest and re-copies
- Or version check that warns when outdated

### 3. Real-World Testing
The commands have never been run end-to-end on a real project. The first priority should be **dogfooding** — use `/ax:init` and `/ax:run` on a small test project and fix whatever breaks.

### 4. CI Template Flexibility
All 4 CI templates hardcode postgres + redis services in integration/scenario jobs. Projects that don't use those services get unnecessary CI config. The templates should be conditional or the init step should strip unused services.

### 5. Status Command Performance
`/ax:status` runs the full test pyramid which can be slow. Should have a `--quick` mode that only checks test file existence and last CI run, skipping actual test execution.

### 6. Config Schema Validation
No validation on `config.json`. If a field is missing or malformed, commands will fail with confusing errors. Should validate config shape at the start of each command.

### 7. Multi-Milestone Support
Currently only tracks one milestone. `phases_completed` resets on new milestone but there's no history. Could track milestone history for progress reporting.

## Development Workflow

1. Edit files in this repo
2. Test by copying to `~/.claude/commands/ax/` and `~/.claude/ax/` and running in a test project
3. Commit and push to `shootdaj/ax`

## Key Conventions

- Step numbers in command files must be sequential and match cross-references
- All config field access uses the pattern `config.X.Y` in instructions
- GSD skills are invoked via `Skill` tool with `skill_name: "gsd:X"`
- Docker compose usage must always check for null `docker_compose_file`
- Python CI template uses `{{INSTALL_COMMAND}}` and `{{LINT_COMMAND}}` placeholders (other templates may still need similar treatment)
