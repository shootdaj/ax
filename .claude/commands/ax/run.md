# /ax:run — Autopilot: Run All Remaining Phases

You are the AX autopilot orchestrator. You chain phases for every remaining phase in the roadmap, then finish the milestone. One command, entire project. The user may walk away — everything should complete without intervention.

## Allowed Tools
Read, Write, Edit, Glob, Grep, Bash, Agent, AskUserQuestion, Skill, mcp__claude_ai_Notion__*

## Context Window Strategy

**Critical:** You are a thin orchestrator. You MUST delegate all heavy work to subagents to preserve your context window. Never do phase work directly.

- Each phase runs inside a **Task subagent** (subagent_type: general-purpose)
- The subagent does ALL the work: discuss, plan, execute, test, verify, Notion updates
- The subagent returns a short summary (pass/fail, test counts, issues)
- You only hold: config, roadmap, phase list, and summaries
- This lets you survive across all phases without running out of context

## Reference File Locations

AX reference files live at one of:
- **Project-local:** `.claude/ax/references/` (takes priority)
- **Global:** `~/.claude/ax/references/`

Check project-local first, then fall back to global.

## Pre-flight

0. **Disable GSD context monitor** (in case GSD was updated since last run):
   ```bash
   node ~/.claude/ax/disable-context-monitor.js
   ```

1. **Check for paused work first.** Look for `.planning/STATE.md` or any GSD pause/handoff artifacts. If found:
   - Run `/gsd:resume-work` via the Skill tool automatically
   - Then continue with the steps below

2. Read `.claude/ax/config.json` to load project config
3. **Validate config.** Check that these required fields exist and are non-empty:
   - `testing.unit_command` — string
   - `testing.stack` — string
   - `phases_completed` — array
   If any required field is missing or malformed, display:
   ```
   AX config is missing required fields: {list}. Run `/ax:init` to regenerate config.
   ```
   And stop.
4. Read `.planning/ROADMAP.md` to get all phases
5. Determine which phases are completed (from config `phases_completed` array)
6. Also check `.planning/phases/phase-*/` directories — if a phase has CONTEXT.md, PLAN.md, or completed execution artifacts but isn't in `phases_completed`, it's partially done. Resume from where it left off rather than restarting it.
7. Build list of remaining/incomplete phases in order

If config doesn't exist, tell the user to run `/ax:init` first and stop.
If no phases remain, tell the user all phases are complete and suggest `/ax:finish`.

---

## Execution Loop

For each remaining phase N (in order):

### Phase Boundary Check

Before starting each phase, read the phase description from ROADMAP.md and check if it requires any external setup:

**Scan for these signals:**
- Cloud service mentions (AWS, GCP, Azure, Stripe, Twilio, SendGrid, etc.)
- API key requirements
- Account creation needs
- Payment/billing setup
- OAuth app registration
- Domain/DNS configuration
- Manual deployment steps

**If external setup is detected:**

Use AskUserQuestion to ask the user:

> "Phase {N} ({Title}) requires the following external setup before it can proceed:
>
> - {List of requirements detected}
>
> Please complete these and provide any needed values (API keys, account IDs, etc.), or say 'skip' to skip this phase."

Wait for the user's response. If they provide values, store them where the phase can access them (environment variables or a `.env` file). If they say 'skip', skip this phase and continue to the next one.

**If no external setup is needed:** Proceed silently.

### Run Phase via Subagent

**Do NOT run `/ax:phase` directly in your context.** Instead, spawn a subagent:

```
Agent(subagent_type: "general-purpose", prompt: "...")
```

**Before spawning**, read the contents of the phase command file (`~/.claude/commands/ax/phase.md` or `.claude/commands/ax/phase.md`) so you can embed it in the subagent prompt.

The subagent prompt should include:
1. The full contents of the phase command instructions (embed the text directly — subagents cannot invoke slash commands directly, so they need the instructions inlined)
2. The phase number: N
3. The AX config contents (from `.claude/ax/config.json`)
4. Whether this is a fresh phase or a resume (and what artifacts already exist)
5. Explicit instruction: "When the instructions say 'run /gsd:X via the Skill tool', use the Skill tool with skill_name 'gsd:X'. Subagents DO have access to the Skill tool."
6. Instruction to return a structured summary at the end:
   - Phase number and title
   - Status: completed / failed
   - Test results: unit (pass/fail/count), integration (pass/fail/count), scenario (pass/fail/count)
   - Gap closures attempted: yes/no, succeeded/failed
   - Notion updated: yes/no
   - Any unresolved issues

This keeps ALL the heavy work (GSD commands, file reads/writes, test runs, Notion API calls) inside the subagent's context, not yours.

### Post-Phase Check

After the subagent returns:

1. **Parse the summary.** Update `.claude/ax/config.json` with the completed phase.

2. **Check for critical failures:** If the subagent reported unresolved test failures or verification gaps:
   - Display the failures to the user
   - Ask: "Phase {N} has unresolved issues. Continue to next phase, retry this phase, or stop?"
   - If "stop": exit the loop and display current status
   - If "retry": re-run the phase via a new subagent
   - If "continue": proceed to next phase

3. **Move on.** Your context should still be lean. Proceed to the next phase.

---

## After All Phases Complete

When all phases have been executed successfully:

1. Display: "All phases complete. Running milestone finish..."
2. Execute `/ax:finish` via a Task subagent (same pattern — delegate the heavy work)

---

## Summary Output

At the end (whether completed or stopped), display:

```
## AX Autopilot Summary

### Phases Completed This Run
| Phase | Title | Tests | Status |
|-------|-------|-------|--------|
| 1     | ...   | ✓     | Done   |
| 2     | ...   | ✓     | Done   |
| 3     | ...   | ✗     | Failed |

### Overall Status
- Phases completed: X / Y
- Total tests: X passed, Y failed
- Notion docs: Updated through Phase X

### Next Action
- All done! / Run `/ax:run` to continue / Fix issues in Phase X
```

---

## Key Behaviors

- **Thin orchestrator:** You are a loop that spawns subagents. Do NOT accumulate phase details in your context.
- **Silent by default:** Don't output status messages between phases unless there's a problem or a question
- **Questions at boundaries:** Only ask questions BEFORE the relevant phase starts, never batch upfront
- **Fail loud, not silent:** If a phase fails and gap closure fails, STOP. Don't skip silently.
- **Respect user time:** If something needs manual action, group related questions together
- **Walk-away safe:** The user should be able to start this and leave. Everything completes autonomously unless a human action is genuinely needed.
