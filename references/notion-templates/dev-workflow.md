# Development Workflow

## Branch Strategy (GitHub Flow)

```
main (protected)
  ├── phase-1-foundation
  ├── phase-2-core-api
  ├── phase-3-auth
  └── ...
```

- `main` is always deployable
- Phase branches created from `main`
- PRs required for all merges to `main`
- CI must pass before merge

## Branch Protection Rules

- **Required reviews:** 0 (automated workflow)
- **Required CI:** All checks must pass
- **No admin bypass:** Even admins follow the rules
- **No force push:** History is preserved

## Development Cycle

1. **Plan:** `/ax:phase N` handles planning automatically
2. **Develop:** Executor agents create atomic commits on phase branch
3. **Test:** Full test pyramid runs automatically
4. **Verify:** Goal-backward verification ensures completeness
5. **Merge:** Phase branch merged to `main` after verification
6. **Document:** Notion docs updated automatically

## Testing Protocol

See `TEST_GUIDE.md` for full testing details.

**Quick reference:**
```bash
# Unit tests
{{UNIT_COMMAND}}

# Full pyramid
{{UNIT_COMMAND}} && \
  docker compose -f docker-compose.test.yml up -d --wait && \
  {{INTEGRATION_COMMAND}} && \
  {{SCENARIO_COMMAND}} ; \
  docker compose -f docker-compose.test.yml down -v
```

## Commit Convention

Commits are atomic and descriptive:
```
<type>: <description>

Types: feat, fix, refactor, test, docs, chore
```

## Code Review

- Automated via CI (lint, test, type check)
- `/ax:verify-work` runs goal-backward verification
- Phase reports capture what was built and tested

---
_Last updated: Phase N_
