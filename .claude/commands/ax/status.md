# /ax:status — Quick Project Overview

You are the AX status reporter. You show a quick overview of project health: progress, tests, CI, documentation, and a full activity timeline.

**Arguments:** `$ARGUMENTS` may contain `quick` or `--quick` to run in fast mode (skip test execution).

## Allowed Tools
Read, Write, Bash, Glob, Grep, Skill

## Pre-flight

Read `.claude/ax/config.json`. If it doesn't exist, display:
```
AX not initialized. Run `/ax:init` to set up the project.
```
And stop.

**Validate config.** Check that these required fields exist and are non-empty:
- `testing.unit_command` — string
- `testing.stack` — string
- `phases_completed` — array

If any required field is missing or malformed, display:
```
AX config is missing required fields: {list}. Run `/ax:init` to regenerate config.
```
And stop.

**Parse mode:** If `$ARGUMENTS` contains `quick` or `--quick`, set `QUICK_MODE = true`. Otherwise `QUICK_MODE = false`.

**Update `last_commands.status`** in `.claude/ax/config.json` to the current ISO timestamp.

---

## Gather Information (in parallel where possible)

### 1. GSD Progress

Run `/gsd:progress` via the Skill tool to get:
- Current phase
- Recent work summary
- Next recommended action

### 2. Test Pyramid Status

**If `QUICK_MODE` is true:** Skip running tests. Instead:
- Check for test file existence using Glob:
  - Unit tests: look for files matching the stack's test patterns (e.g., `*_test.go`, `*.test.ts`, `test_*.py`, etc.)
  - Integration tests: look for files in integration test directories
  - Scenario tests: look for files in scenario test directories
- Report count of test files found per tier, or "No test files" if none exist
- Do NOT execute any test commands

**If `QUICK_MODE` is false:** Run tests with short output. Use test commands from config but suppress verbose output:

For each tier, capture pass/fail counts:

```bash
# Unit tests (run and capture summary)
{config.testing.unit_command} 2>&1 | tail -20
```

**If `config.testing.docker_compose_file` is not null:**
```bash
docker compose -f {config.testing.docker_compose_file} up -d --wait 2>/dev/null
{config.testing.integration_command} 2>&1 | tail -20
{config.testing.scenario_command} 2>&1 | tail -20
docker compose -f {config.testing.docker_compose_file} down -v 2>/dev/null
```

**If `config.testing.docker_compose_file` is null:** Run integration and scenario commands directly (without docker compose), if those commands are set in config. If they are also null/empty, skip those tiers.

If tests haven't been written yet (commands fail with "no test files"), report "No tests yet" rather than "Failed".

### 3. CI Status

```bash
gh run list --limit 3 --json status,conclusion,event,headBranch,createdAt \
  --jq '.[] | "\(.headBranch) | \(.status) | \(.conclusion // "running") | \(.createdAt)"'
```

If `gh` is not available or not in a GitHub repo, report "CI status unavailable".

### 4. Notion Doc Freshness

Read `notion.last_updated` from config:
- If null: "Notion not configured"
- If set: Calculate time since last update and report

Also check `phases_completed` array to see which phases have updated docs.

### 5. Activity Timeline

Build a chronological timeline from config timestamps. Collect these data points:

- `initialized_at` — when the project was initialized
- `last_commands.init` — last init run
- `last_commands.phase` — last phase command run
- `last_commands.run` — last autopilot run
- `last_commands.finish` — last milestone finish
- `last_commands.status` — last status check (this run)
- Each entry in `phases_completed[]`:
  - `.started_at` — when this phase started
  - `.completed_at` — when this phase completed
- Each entry in `milestone_history[]`:
  - `.completed_at` — when this milestone was finished

Sort all non-null timestamps chronologically. This gives the user a clear picture of **when** everything happened.

### 6. Milestone History (if available)

Read `milestone_history` from config:
- If the array exists and has entries, show a brief history of completed milestones
- If not present or empty, skip this section

---

## Display

```
## AX Status {quick mode: "(quick)" or ""}

### Progress
{GSD progress output — current phase, recent work, next action}

### Test Health
| Tier        | Status  | Passed | Failed |
|-------------|---------|--------|--------|
| Unit        | pass/fail/-- |  X   |   X    |
| Integration | pass/fail/-- |  X   |   X    |
| Scenario    | pass/fail/-- |  X   |   X    |

{In quick mode, show file counts instead of pass/fail:}
| Tier        | Test Files |
|-------------|------------|
| Unit        | X files    |
| Integration | X files    |
| Scenario    | X files    |

### CI (Last 3 Runs)
| Branch       | Status    | When         |
|-------------|-----------|--------------|
| {branch}    | {status}  | {timestamp}  |

### Activity Timeline
| When                 | Event                              |
|----------------------|------------------------------------|
| 2026-03-07 09:15 AM  | Project initialized (greenfield)   |
| 2026-03-07 10:30 AM  | Phase 1: Core API — started        |
| 2026-03-07 02:45 PM  | Phase 1: Core API — completed      |
| 2026-03-08 09:00 AM  | Phase 2: Auth System — started     |
| 2026-03-08 01:15 PM  | Phase 2: Auth System — completed   |
| 2026-03-09 11:00 AM  | /ax:status ran                     |

{Show human-readable dates (local timezone). Include phase titles from the phases_completed objects. Omit null entries.}

### Phase Details
| Phase | Title        | Started              | Completed            | Duration |
|-------|-------------|----------------------|----------------------|----------|
| 1     | Core API    | Mar 7, 10:30 AM      | Mar 7, 2:45 PM       | 4h 15m   |
| 2     | Auth System | Mar 8, 9:00 AM       | Mar 8, 1:15 PM       | 4h 15m   |

{Calculate duration from started_at to completed_at for each phase. If a phase has started_at but no completed_at, show "In progress" for duration.}

### Documentation
- Notion: {configured/not configured}
- Last updated: {timestamp or "never"}
- Phases documented: {list}

### Milestone History
{If milestone_history exists:}
| Milestone | Version | Phases | Completed            |
|-----------|---------|--------|----------------------|
| {name}    | {ver}   | {N}    | {date and time}      |
{Otherwise omit this section}

### Quick Actions
- Next phase: `/ax:phase {N}`
- Run all: `/ax:run`
- Full status: `/ax:status` (without --quick)
```

---

## Key Behaviors

- **Fast:** Don't run lengthy operations. If tests take more than 60 seconds, use timeout and report "timed out"
- **Non-destructive:** Only reads config — the only write is updating `last_commands.status`
- **Graceful degradation:** If any check fails (gh not installed, docker not running, etc.), report the failure and continue with other checks
- **Quick mode:** When `--quick` is passed, the entire command should complete in seconds — no test execution, no docker compose, just file checks and API calls
- **Timestamps:** All timestamps displayed in human-readable local timezone format (e.g., "Mar 7, 2:45 PM" or "2026-03-07 14:45"). Use relative time (e.g., "2 hours ago") for recent events if it aids readability.
