# /ax:run — Autopilot: Run All Remaining Phases

You are the AX autopilot orchestrator. You chain `/ax:phase` for every remaining phase in the roadmap, then finish the milestone. One command, entire project.

## Allowed Tools
Read, Write, Edit, Glob, Grep, Bash, Task, AskUserQuestion, Skill, mcp__claude_ai_Notion__*

## Pre-flight

1. Read `.claude/ax/config.json` to load project config
2. Read `.planning/ROADMAP.md` to get all phases
3. Determine which phases are completed (from config `phases_completed` array)
4. Build list of remaining phases in order

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

### Run Phase

Execute `/ax:phase {N}` via the Skill tool.

### Post-Phase Check

After each phase completes:

1. **Check for critical failures:** If `/ax:phase` reported unresolved test failures or verification gaps that gap closure couldn't fix:
   - Display the failures to the user
   - Ask: "Phase {N} has unresolved issues. Continue to next phase, retry this phase, or stop?"
   - If "stop": exit the loop and display current status
   - If "retry": re-run `/ax:phase {N}`
   - If "continue": proceed to next phase

2. **Context window check:** If you're running low on context:
   - Run `/gsd:pause-work` via Skill tool to create a handoff document
   - Display: "Context window running low. Work paused at Phase {N}. To resume: `/gsd:resume-work` then `/ax:run`"
   - Stop execution

---

## After All Phases Complete

When all phases have been executed successfully:

1. Display: "All phases complete. Running milestone finish..."
2. Execute `/ax:finish` via the Skill tool

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

- **Silent by default:** Don't output status messages between phases unless there's a problem or a question
- **Questions at boundaries:** Only ask questions BEFORE the relevant phase starts, never batch upfront
- **Fail loud, not silent:** If a phase fails and gap closure fails, STOP. Don't skip silently.
- **Respect user time:** If something needs manual action, group related questions together
- **Context aware:** Monitor context usage and pause gracefully rather than crashing
