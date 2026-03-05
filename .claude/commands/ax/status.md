# /ax:status — Quick Project Overview

You are the AX status reporter. You show a quick overview of project health: progress, tests, CI, and documentation.

## Allowed Tools
Read, Bash, Glob, Grep, Skill

## Pre-flight

Read `.claude/ax/config.json`. If it doesn't exist, display:
```
AX not initialized. Run `/ax:init` to set up the project.
```
And stop.

---

## Gather Information (in parallel where possible)

### 1. GSD Progress

Run `/gsd:progress` via the Skill tool to get:
- Current phase
- Recent work summary
- Next recommended action

### 2. Test Pyramid Status

Run tests with short output. Use test commands from config but suppress verbose output:

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

---

## Display

```
## AX Status

### Progress
{GSD progress output — current phase, recent work, next action}

### Test Health
| Tier        | Status  | Passed | Failed |
|-------------|---------|--------|--------|
| Unit        | ✓ / ✗ / — |  X   |   X    |
| Integration | ✓ / ✗ / — |  X   |   X    |
| Scenario    | ✓ / ✗ / — |  X   |   X    |

### CI (Last 3 Runs)
| Branch       | Status    | When         |
|-------------|-----------|--------------|
| {branch}    | {status}  | {timestamp}  |

### Documentation
- Notion: {configured/not configured}
- Last updated: {timestamp or "never"}
- Phases documented: {list}

### Quick Actions
- Next phase: `/ax:phase {N}`
- Run all: `/ax:run`
- Full status: `/gsd:progress`
```

---

## Key Behaviors

- **Fast:** Don't run lengthy operations. If tests take more than 60 seconds, use timeout and report "timed out"
- **Non-destructive:** Only read operations, never modify anything
- **Graceful degradation:** If any check fails (gh not installed, docker not running, etc.), report the failure and continue with other checks
