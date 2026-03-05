# /ax:finish — Complete Milestone

You are the AX milestone completion orchestrator. You wrap up a milestone: audit, close gaps, tag, archive, and publish final documentation.

**Arguments:** `$ARGUMENTS` may contain a version string (e.g., `v1.0`). If not provided, determine from PROJECT.md or default to `v1.0`.

## Allowed Tools
Read, Write, Bash, Agent, AskUserQuestion, Skill, mcp__claude_ai_Notion__*

## Pre-flight

1. Read `.claude/ax/config.json` to load project config
2. **Validate config.** Check that these required fields exist and are non-empty:
   - `testing.unit_command` — string
   - `testing.stack` — string
   - `phases_completed` — array
   If `notion.parent_page_id` is set (not null), also check:
   - `notion.doc_pages` — object with at least `phase_reports` key
   If any required field is missing or malformed, display:
   ```
   AX config is missing required fields: {list}. Run `/ax:init` to regenerate config.
   ```
   And stop.
3. Read `.planning/ROADMAP.md` and `PROJECT.md` to understand milestone scope
4. Parse version from `$ARGUMENTS` (default: `v1.0`)

If config doesn't exist, tell the user to run `/ax:init` first and stop.

---

## Execution Steps

### Step 1: Audit Milestone

Run `/gsd:audit-milestone` via the Skill tool. This verifies that the milestone achieved its original intent by checking all phases against the project goals.

The audit produces a report identifying:
- Requirements fully met
- Requirements partially met
- Requirements not met
- Gaps that need closure

---

### Step 2: Close Gaps (if needed)

If the audit found gaps:

1. Run `/gsd:plan-milestone-gaps` via the Skill tool to create phases that address the gaps
2. For each gap phase created, run `/ax:phase {N}` to execute it fully (plan → execute → test → verify → Notion)
3. After all gap phases complete, re-read the audit to confirm gaps are closed

If no gaps found, skip to Step 3.

---

### Step 3: Complete Milestone

Run `/gsd:complete-milestone {version}` via the Skill tool (where `{version}` is from arguments or default).

This will:
- Archive planning documents
- Create a git tag for the version
- Update PROJECT.md status

---

### Step 4: Publish Final Notion Documentation

**Skip if Notion is not configured.**

Spawn an Agent (subagent_type: general-purpose) to create comprehensive final documentation. The agent should:

1. **Read the entire codebase** to create accurate, up-to-date documentation
2. **Update all Notion doc pages** (using page IDs from config):

   - **Architecture** — Final architecture with all components, technology stack, and design patterns. Synthesize from all phase summaries and current codebase state.
   - **Data Flow** — Complete data flow documentation showing how data moves through the system.
   - **API Reference** — Complete API documentation with all endpoints, request/response formats, and auth details.
   - **Component Index** — Full component listing with locations, purposes, and dependencies.
   - **ADRs** — All architectural decisions made during development.
   - **Deployment** — Final deployment guide with all environments, commands, and configuration.
   - **Dev Workflow** — Updated workflow documentation reflecting final state.

3. **Create Milestone Completion Report** as a child page under "Phase Reports":
   - Summary of all phases completed
   - Aggregate test results across all phases
   - Requirements coverage matrix
   - Known issues and technical debt
   - Architecture summary

4. **Update config:** Set `notion.last_updated` to current timestamp

---

### Step 5: Final Test Run

Run the complete test pyramid one final time to confirm everything passes:

```bash
{config.testing.unit_command}
```

**If `config.testing.docker_compose_file` is not null:**
```bash
docker compose -f {config.testing.docker_compose_file} up -d --wait && \
  {config.testing.integration_command} && \
  {config.testing.scenario_command} ; \
  docker compose -f {config.testing.docker_compose_file} down -v
```

**If `config.testing.docker_compose_file` is null:** Run integration and scenario commands directly (if they exist), or skip those tiers.

---

### Step 6: Archive Milestone to History

Append the completed milestone to the `milestone_history` array in `.claude/ax/config.json`, then reset `phases_completed` for the next milestone:

```json
{
  "milestone_history": [
    ...existing_entries,
    {
      "version": "{version}",
      "project_name": "{config.project_name}",
      "phases_completed": [... copy of current phases_completed],
      "completed_at": "<ISO timestamp>",
      "test_results": {
        "unit": { "passed": X, "failed": Y },
        "integration": { "passed": X, "failed": Y },
        "scenario": { "passed": X, "failed": Y }
      }
    }
  ],
  "phases_completed": []
}
```

This preserves history across milestones so `/ax:status` can report on past work, while resetting `phases_completed` so the next milestone starts fresh.

---

### Step 7: Display Summary

```
## Milestone Complete: {version}

### Scope
- Phases completed: {X}
- Requirements delivered: {Y} / {Z}

### Final Test Results
| Tier        | Total | Passed | Failed | Skipped |
|-------------|-------|--------|--------|---------|
| Unit        |   X   |   X    |   X    |    X    |
| Integration |   X   |   X    |   X    |    X    |
| Scenario    |   X   |   X    |   X    |    X    |

### Gap Closures
- {Count} gaps identified and closed / No gaps found

### Documentation
- Notion: All 8 pages updated with final documentation
- Milestone completion report created
- Git tag: {version}

### What's Next
- Start next milestone: `/gsd:new-milestone`
- Or begin a new project
```
