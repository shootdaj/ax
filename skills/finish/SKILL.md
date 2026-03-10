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
5. Update `last_commands.finish` in config to current ISO timestamp

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

**If `config.notion.parent_page_id` is null, skip this step.**

**If Notion IS configured, this step is MANDATORY. Do NOT skip it. The milestone is not complete without final documentation.**

Spawn an Agent (subagent_type: general-purpose) to create comprehensive final documentation. The agent MUST:

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

### Step 6: Deploy

**Skip if `config.deployment.provider` is `"none"` or `config.deployment` does not exist.**

Deploy the project based on the configured provider:

**Vercel (web apps):**
```bash
# Ensure Vercel CLI is available
command -v vercel || npm i -g vercel

# Deploy to production
vercel --prod --yes
```

Capture the deployment URL from the output and store it in `config.deployment.url`.

If the project needs external services (databases, caches), check whether the deployment has the required environment variables configured. If not, warn the user:

> "Deployment succeeded but the app may need environment variables configured in Vercel (DATABASE_URL, REDIS_URL, etc.). Set these in your Vercel project settings."

**npm (Node.js libraries):**
```bash
npm publish
```

Store the package URL as `config.deployment.url` (e.g., `https://www.npmjs.com/package/{name}`).

**PyPI (Python libraries):**
```bash
python -m build
twine upload dist/*
```

Store `https://pypi.org/project/{name}` as `config.deployment.url`.

**crates.io (Rust libraries):**
```bash
cargo publish
```

Store `https://crates.io/crates/{name}` as `config.deployment.url`.

**go-module (Go libraries):**
Go modules are distributed via git tags — the tag was already created in Step 3. No additional action needed. Store the module path as `config.deployment.url`.

**github-releases (CLI tools):**
```bash
gh release create {version} --title "{version}" --generate-notes
```

Store the release URL as `config.deployment.url`.

**docker (containerized apps):**
```bash
docker build -t {config.project_name}:{version} .
```

Log a note that the image is built locally. If a container registry is configured, push the image. Otherwise, warn the user:

> "Docker image built: `{project_name}:{version}`. Push to a registry and deploy to your hosting platform manually."

If deployment fails, log the error but continue — do not block milestone completion.

**Post-deployment verification (web apps only — Vercel, Docker):**

After deploying, verify the live app actually works:

1. Wait 10 seconds for deployment to propagate
2. Test the health/root endpoint:
   ```bash
   curl -s -o /dev/null -w "%{http_code}" {deployment_url}/health || curl -s -o /dev/null -w "%{http_code}" {deployment_url}/
   ```
3. Test 2-3 key API endpoints from the app (pick from the routes defined in the codebase)
4. If any endpoint returns a non-2xx status:
   - Read vercel.json and the Express app to check for routing mismatches
   - Common issue: Vercel does NOT strip path prefixes — `/api/(.*)` passes the full `/api/...` URL to Express, so Express routes must use their full paths
   - Fix the issue, redeploy with `vercel --prod --yes`, and re-verify
5. Only proceed to Step 7 once at least the health endpoint returns 200

---

### Step 7: Archive Milestone to History

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
      "deployment": {
        "provider": "<from config.deployment.provider>",
        "url": "<from config.deployment.url or null>"
      },
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

### Step 8: Display Summary

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

### Deployment
- Provider: {provider} / skipped
- URL: {deployment_url} / N/A

### Documentation
- Notion: All 8 pages updated with final documentation
- Milestone completion report created
- Git tag: {version}

### What's Next
- Start next milestone: `/gsd:new-milestone`
- Or begin a new project
```
