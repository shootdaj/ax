# /ax:init — Full Project Setup

You are the AX init orchestrator. You set up everything for a new project: GSD project initialization, CI scaffolding, testing infrastructure, GitHub Flow, and Notion documentation.

## Allowed Tools
Read, Write, Edit, Bash, Glob, Grep, Task, AskUserQuestion, Skill, mcp__claude_ai_Notion__*

## Execution Steps

Execute these steps in order. Do NOT skip steps. Do NOT ask for confirmation between steps — only pause where explicitly marked.

## Reference File Locations

AX reference files (templates, CI configs, Notion templates) live at one of:
- **Project-local:** `.claude/ax/references/` (takes priority)
- **Global:** `~/.claude/ax/references/`

When the instructions say "read from `.claude/ax/references/...`", check the project-local path first, then fall back to the global path.

---

### Step 1: Run GSD New Project

Run `/gsd:new-project` via the Skill tool. This will interactively question the user to understand the project, then run research, requirements gathering, and roadmap creation.

Wait for this to complete fully before proceeding. The output includes:
- `PROJECT.md` — project definition
- `.planning/REQUIREMENTS.md` — requirements
- `.planning/ROADMAP.md` — phased roadmap

---

### Step 2: Detect Stack

Examine the project to determine the tech stack. Check these sources in order:
1. Files from GSD output: `PROJECT.md`, `.planning/research/` files
2. Project files: `go.mod`, `package.json`, `requirements.txt`, `pyproject.toml`, `Cargo.toml`, `Gemfile`, `build.gradle`, `pom.xml`, `mix.exs`, `Package.swift`, etc.
3. If still unclear, check ROADMAP.md for technology mentions

**If a known template stack is detected** (`go`, `node`, `python`, `rust`):
- Set `stack` to the detected value
- Auto-detect language version, package manager, and test framework
- Use the matching CI template and test command defaults

**If the stack is anything else** (Swift, Kotlin, Elixir, Java, C#, Ruby, Zig, a multi-language project, etc.):
- Set `stack` to the actual stack name (e.g., `swift`, `kotlin`, `elixir`)
- Set `has_template` to `false` in config
- Research the stack's ecosystem (web search) to determine idiomatic test runners, linters, CI setup, and directory conventions
- Set up sensible defaults based on research — the agent should be able to figure out how to test, lint, and build any mainstream stack without asking
- Only ask the user if the stack is truly obscure or the research is inconclusive. In that case, ask a single open-ended question:

> "Detected stack: **{stack}**. How do you run tests, lint, and build in this project? (e.g., `swift test`, `swiftlint`, `swift build`). I'll set up CI and test infrastructure from there."

Store all detected/provided values:
- **Language/runtime version** (e.g., Go 1.22, Node 20, Python 3.12, Swift 5.10)
- **Package manager** (npm, cargo, pip, swift package manager, gradle, mix, etc.)
- **Test framework** (go test, jest, pytest, XCTest, JUnit, ExUnit, etc.)
- **Lint command**
- **Build command**
- **Unit/integration/scenario test commands**

---

### Step 3: Ask for Notion Parent Page ID

Use AskUserQuestion to ask:

> "What is the Notion parent page ID where project documentation should be created? You can find this in the page URL — it's the 32-character hex string at the end. Example: `https://notion.so/My-Page-abc123def456...` → the ID is `abc123def456...`"

Store the response. If the user says to skip Notion, set `notion.parent_page_id` to `null` in config and skip all Notion steps.

---

### Step 4: Scaffold CI

**If the stack has a template** (`go`, `node`, `python`, `rust`):
1. Read the CI template from `.claude/ax/references/ci-templates/{stack}.yml`
2. Replace all `{{VARIABLE}}` placeholders with detected values from Step 2
3. Write the result to `.github/workflows/ci.yml`

For Node.js projects, also detect and set:
- `{{PACKAGE_MANAGER}}` — npm, yarn, pnpm, or bun
- `{{INSTALL_COMMAND}}` — `npm ci`, `yarn install --frozen-lockfile`, `pnpm install --frozen-lockfile`, or `bun install`
- `{{LINT_COMMAND}}` — `npm run lint`, `yarn lint`, etc.

**If the stack has no template:**
Generate a `.github/workflows/ci.yml` from scratch using the commands gathered in Step 2. Follow the same pipeline pattern as the templates:

```
lint → unit tests → harness up → integration tests → scenario tests → harness down
```

Use your knowledge of the stack to set up the correct GitHub Actions runner, language setup action (if one exists), caching, and service containers. If the stack needs docker-compose for test infra, use the `docker compose` approach. If it doesn't need any test infrastructure, skip the harness steps.

Write the generated CI file and note `"ci_generated": true` in config.

---

### Step 5: Scaffold Testing Infrastructure

1. **Create test directories** using the stack's idiomatic conventions:
   - Go: `test/integration/`, `test/scenarios/`
   - Node: `test/integration/`, `test/scenarios/`
   - Python: `tests/integration/`, `tests/scenarios/`
   - Rust: `tests/integration/`, `tests/scenarios/`
   - Other stacks: use the convention gathered in Step 2, or research the idiomatic test layout for the stack. Default to `test/integration/`, `test/scenarios/` if unclear.

2. **Create `docker-compose.test.yml`** at project root — but only if the project actually needs test infrastructure. Check ROADMAP.md and REQUIREMENTS.md for database/cache/queue mentions. If the project is a pure CLI tool or library with no external dependencies, skip this file entirely and set `docker_compose_file` to `null` in config.

3. **Create `TEST_GUIDE.md`** at project root using the template from `.claude/ax/references/test-guide-template.md`, with all `{{VARIABLES}}` replaced using values from Step 2.

**Test commands** come from Step 2 — either auto-detected for known stacks or provided by the user/researched for custom stacks. Known stack defaults:
- **Go:** `go test ./internal/... ./pkg/... -v -race` (unit), `go test ./test/integration/... -v -tags integration` (integration), `go test ./test/scenarios/... -v -tags scenario` (scenario)
- **Node:** `npx vitest run --dir src` (unit), `npx vitest run --dir test/integration` (integration), `npx vitest run --dir test/scenarios` (scenario) — adjust for jest if detected
- **Python:** `pytest tests/unit/ -v` (unit), `pytest tests/integration/ -v -m integration` (integration), `pytest tests/scenarios/ -v -m scenario` (scenario)
- **Rust:** `cargo test --lib --bins -v` (unit), `cargo test --test '*' -v` (integration), `cargo test --test 'scenario_*' -v` (scenario)

---

### Step 6: Set Up GitHub Flow

Run these commands via Bash:

```bash
# Create phase-1 branch from main
git checkout main 2>/dev/null || git checkout -b main
git checkout -b phase-1-setup

# Set up branch protection on main (requires gh CLI)
gh api repos/{owner}/{repo}/branches/main/protection \
  --method PUT \
  --field "required_status_checks[strict]=true" \
  --field "required_status_checks[contexts][]=CI" \
  --field "enforce_admins=true" \
  --field "required_pull_request_reviews=null" \
  --field "restrictions=null" \
  --field "allow_force_pushes=false" \
  --field "allow_deletions=false"
```

If branch protection fails (e.g., free plan, no admin access), log a warning but continue. Do NOT fail the init.

---

### Step 7: Create Notion Documentation Tree

**Skip this step if `notion.parent_page_id` is null.**

Use the `mcp__claude_ai_Notion__notion-create-pages` tool to create 8 child pages under the parent page. Create them one at a time and store each page ID.

Pages to create (use content from `.claude/ax/references/notion-templates/`):
1. **Architecture** — from `architecture.md`
2. **Data Flow** — from `data-flow.md`
3. **API Reference** — from `api-reference.md`
4. **Component Index** — from `component-index.md`
5. **ADRs** — from `adr.md`
6. **Deployment** — from `deployment.md`
7. **Dev Workflow** — from `dev-workflow.md`
8. **Phase Reports** — from `phase-report.md` (this becomes the parent for individual phase report pages)

Store all page IDs in the config for later updates.

---

### Step 8: Inject Testing Methodology into CLAUDE.md

Append the following section to the project's `CLAUDE.md` file (create it if it doesn't exist). Do NOT overwrite existing content.

```markdown

# Testing Requirements (AX)

Every feature implementation MUST include tests at all three tiers:

## Test Tiers
1. **Unit tests** — Test individual functions/methods in isolation. Mock external dependencies.
2. **Integration tests** — Test component interactions with real services via docker-compose.test.yml.
3. **Scenario tests** — Test full user workflows end-to-end.

## Test Naming
Use semantic names: `Test<Component>_<Behavior>[_<Condition>]`
- Good: `TestAuthService_LoginWithValidCredentials`, `TestFullCheckoutFlow`
- Bad: `TestShouldWork`, `Test1`, `TestGivenUserWhenLoginThenSuccess`

## Reference
- See `TEST_GUIDE.md` for requirement-to-test mapping
- See `.claude/ax/references/testing-pyramid.md` for full methodology
- Every requirement in ROADMAP.md must map to at least one scenario test
```

---

### Step 9: Write AX Config

Write `.claude/ax/config.json` with all gathered information:

```json
{
  "initialized_at": "<ISO timestamp>",
  "project_name": "<from PROJECT.md>",
  "notion": {
    "parent_page_id": "<from Step 3 or null>",
    "doc_pages": {
      "architecture": "<page_id or null>",
      "data_flow": "<page_id or null>",
      "api_reference": "<page_id or null>",
      "component_index": "<page_id or null>",
      "adrs": "<page_id or null>",
      "deployment": "<page_id or null>",
      "dev_workflow": "<page_id or null>",
      "phase_reports": "<page_id or null>"
    },
    "last_updated": "<ISO timestamp or null>"
  },
  "testing": {
    "stack": "<detected stack>",
    "language_version": "<detected version>",
    "test_framework": "<detected framework>",
    "unit_command": "<from Step 5>",
    "integration_command": "<from Step 5>",
    "scenario_command": "<from Step 5>",
    "docker_compose_file": "docker-compose.test.yml"
  },
  "ci": {
    "provider": "github-actions",
    "workflow_file": ".github/workflows/ci.yml"
  },
  "phases_completed": []
}
```

---

### Step 10: Commit Everything

Stage and commit all new files:

```bash
git add .claude/ax/ .github/workflows/ci.yml docker-compose.test.yml TEST_GUIDE.md CLAUDE.md
git add test/ tests/ 2>/dev/null  # May not exist for all stacks
git commit -m "chore: AX init — CI, testing infrastructure, Notion docs, branch protection"
```

---

## Output

After all steps complete, display a summary:

```
## AX Init Complete

**Project:** <name>
**Stack:** <stack> (<version>)
**CI:** .github/workflows/ci.yml
**Testing:** docker-compose.test.yml + TEST_GUIDE.md
**Branch protection:** <enabled/failed>
**Notion docs:** <8 pages created / skipped>
**Config:** .claude/ax/config.json

Next: Run `/ax:phase 1` to start the first phase.
```
