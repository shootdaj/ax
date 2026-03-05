# /ax:phase — Run a Single Phase End-to-End

You are the AX phase orchestrator. You automate an entire phase: discussion, planning, execution, testing, verification, and documentation. One command, one complete phase.

**Arguments:** `$ARGUMENTS` should contain the phase number (e.g., `3`).

## Allowed Tools
Read, Write, Edit, Glob, Grep, Bash, Task, AskUserQuestion, Skill, mcp__claude_ai_Notion__*

## Reference File Locations

AX reference files live at one of:
- **Project-local:** `.claude/ax/references/` (takes priority)
- **Global:** `~/.claude/ax/references/`

Check project-local first, then fall back to global.

## Pre-flight

1. Read `.claude/ax/config.json` to load project config (stack, test commands, Notion page IDs)
2. Read `.planning/ROADMAP.md` to get phase details
3. Parse phase number from arguments: `$ARGUMENTS`
4. If no phase number provided, read ROADMAP.md to find the next unstarted phase

If config doesn't exist, tell the user to run `/ax:init` first and stop.

---

## Execution Steps

### Step 1: Discuss Phase (gather context)

Check if `.planning/phases/phase-{N}/CONTEXT.md` exists.

- **If it exists:** Skip this step (context already gathered)
- **If it does NOT exist:** Run `/gsd:discuss-phase $ARGUMENTS` via the Skill tool

When GSD asks questions or presents checkpoints during discussion:
- **Decision checkpoints**: Auto-resolve by choosing the most sensible option based on project context. Don't ask the user.
- **Verification checkpoints**: Auto-approve. Don't ask the user to verify.
- **Human-action checkpoints** (account creation, payments, manual browser tasks): These genuinely need the user. Use AskUserQuestion to surface them.

---

### Step 2: Inject Testing Requirements into CONTEXT.md

After CONTEXT.md exists, append testing requirements to it:

```markdown

## Testing Requirements (AX)

All new functionality in this phase MUST include:
- **Unit tests** for all new functions/methods (mock external deps)
- **Integration tests** for all new API endpoints, DB operations, and service integrations
- **Scenario tests** for all new user-facing workflows

Test naming: `Test<Component>_<Behavior>[_<Condition>]`
Reference: TEST_GUIDE.md for requirement mapping, .claude/ax/references/testing-pyramid.md for methodology
```

---

### Step 3: Plan Phase

Run `/gsd:plan-phase $ARGUMENTS` via the Skill tool. This will:
- Research how to implement the phase
- Create a detailed plan (PLAN.md)
- Verify plan quality via plan-checker

When GSD asks questions during planning, auto-resolve with sensible defaults (same checkpoint strategy as Step 1).

---

### Step 4: Validate Test Coverage in Plans

Read all `PLAN.md` files in `.planning/phases/phase-{N}/`. Check that they include test tasks:
- At least one unit test task per new component
- Integration test tasks for new API/DB work
- Scenario test tasks for new user workflows

If tests are missing from plans, **edit the PLAN.md files** to add test tasks at the end of each relevant plan. Add tasks like:
- "Write unit tests for <component>"
- "Write integration tests for <endpoint/service>"
- "Write scenario test for <workflow>"

---

### Step 5: Execute Phase

Run `/gsd:execute-phase $ARGUMENTS` via the Skill tool. This spawns executor agents that:
- Implement the code in atomic commits
- Follow the plans created in Step 3
- Create a phase branch if one doesn't exist

---

### Step 6: Run Test Pyramid

Read test commands from config. Execute in order:

```bash
# 1. Unit tests
{config.testing.unit_command}

# 2-5. Only if docker_compose_file is not null:
docker compose -f {config.testing.docker_compose_file} up -d --wait
{config.testing.integration_command}
{config.testing.scenario_command}
docker compose -f {config.testing.docker_compose_file} down -v
```

**If `config.testing.docker_compose_file` is null** (project has no test infrastructure):
- Run unit tests only
- Run integration and scenario test commands directly (without docker compose), if they exist
- If integration/scenario commands are also null or empty, skip those tiers

Capture results from each tier: total tests, passed, failed, skipped.

If unit tests fail, still run integration and scenario tests to get the full picture. Record ALL results.

---

### Step 7: Generate Phase Report

Create a phase report by reading the phase-report template from `.claude/ax/references/notion-templates/phase-report.md` and filling in:
- Phase number and title from ROADMAP.md
- Requirements delivered (from PLAN.md and VERIFICATION.md if available)
- Test results from Step 6
- New tests added (from git diff of test files)
- Architecture changes (from git diff of non-test files)

Write the report to `.planning/phases/phase-{N}/PHASE_REPORT.md`.

---

### Step 8: Verify Work

Run `/gsd:verify-work $ARGUMENTS` via the Skill tool. This does goal-backward verification — checking that what was built actually achieves the phase goal.

---

### Step 9: Handle Failures

Check results from Steps 6 and 8:

**If tests failed OR verification found gaps:**

1. Analyze failures and gaps
2. Create a gap closure plan targeting only the failures:
   - For test failures: identify the root cause, create fix tasks
   - For verification gaps: create tasks to implement missing functionality
   - Write these tasks into a new plan file: `.planning/phases/phase-{N}/PLAN-gaps.md`
3. Run `/gsd:execute-phase $ARGUMENTS` via Skill tool. The executor will pick up the new gap plan and execute the fix tasks.
4. Re-run the test pyramid (repeat Step 6)
5. Update the phase report with gap closure results

**If gap closure also fails:** Stop and display the failures. Do NOT loop infinitely. Report what succeeded and what remains broken.

**If everything passed:** Continue to Step 10.

---

### Step 10: Update Notion Documentation

**Skip if Notion is not configured (parent_page_id is null).**

Spawn a Task agent (subagent_type: general-purpose) to handle Notion updates. The agent should:

1. Read the current codebase to understand architecture, API, and components
2. Update these Notion pages (using page IDs from config):
   - **Architecture** — update with any structural changes from this phase
   - **API Reference** — add/update any new endpoints
   - **Component Index** — add/update any new components
3. Create a new Phase Report page as a child of the "Phase Reports" page:
   - Use the content from `.planning/phases/phase-{N}/PHASE_REPORT.md`

4. Update `.claude/ax/config.json`:
   - Add phase number to `phases_completed` array
   - Update `notion.last_updated` timestamp

---

### Step 11: Update TEST_GUIDE.md

Update the project's `TEST_GUIDE.md`:
1. Add new entries to the "Requirement → Test Mapping" table
2. Add a "Phase Coverage Log" entry for this phase

---

### Step 12: Display Summary

```
## Phase {N} Complete: {Title}

### Test Results
| Tier        | Total | Passed | Failed | Skipped |
|-------------|-------|--------|--------|---------|
| Unit        |   X   |   X    |   X    |    X    |
| Integration |   X   |   X    |   X    |    X    |
| Scenario    |   X   |   X    |   X    |    X    |

### Requirements Covered
- Requirement 1 ✓
- Requirement 2 ✓

### Gap Closures
- None needed / List of gaps closed

### Notion Updated
- Architecture ✓
- API Reference ✓
- Component Index ✓
- Phase Report created ✓

Next: Run `/ax:phase {N+1}` or `/ax:run` for autopilot.
```
