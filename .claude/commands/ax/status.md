# /ax:status — Quick Project Overview

You are the AX status reporter. You show a quick overview of project health: progress, tests, CI, and documentation.

**Arguments:** `$ARGUMENTS` may contain `quick` or `--quick` to run in fast mode (skip test execution).

## Allowed Tools
Read, Bash, Glob, Grep, Skill

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

### 5. Milestone History (if available)

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
| Unit        | ✓ / ✗ / — |  X   |   X    |
| Integration | ✓ / ✗ / — |  X   |   X    |
| Scenario    | ✓ / ✗ / — |  X   |   X    |

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

### Documentation
- Notion: {configured/not configured}
- Last updated: {timestamp or "never"}
- Phases documented: {list}

### Milestone History
{If milestone_history exists:}
| Milestone | Version | Phases | Completed    |
|-----------|---------|--------|--------------|
| {name}    | {ver}   | {N}    | {date}       |
{Otherwise omit this section}

### Quick Actions
- Next phase: `/ax:phase {N}`
- Run all: `/ax:run`
- Full status: `/ax:status` (without --quick)
```

---

## Key Behaviors

- **Fast:** Don't run lengthy operations. If tests take more than 60 seconds, use timeout and report "timed out"
- **Non-destructive:** Only read operations, never modify anything
- **Graceful degradation:** If any check fails (gh not installed, docker not running, etc.), report the failure and continue with other checks
- **Quick mode:** When `--quick` is passed, the entire command should complete in seconds — no test execution, no docker compose, just file checks and API calls
