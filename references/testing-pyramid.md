# Testing Pyramid Methodology

## Philosophy

Every feature gets three tiers of testing. Tests use **semantic function names** that describe behavior — NOT Gherkin syntax. Tests are documentation; reading test names should explain what the system does.

## Three Tiers

### Tier 1: Unit Tests
- **Scope:** Single function/method, no external dependencies
- **Speed:** Milliseconds
- **Mocking:** Mock all external dependencies (DB, HTTP, filesystem)
- **Naming:** `TestParseUserInput_ValidEmail`, `TestCalculateDiscount_BulkOrder`
- **Location:** Same package/directory as the code being tested
- **Coverage target:** All public functions, all branch paths for business logic

### Tier 2: Integration Tests
- **Scope:** Component interactions with real dependencies (database, cache, queue)
- **Speed:** Seconds
- **Infrastructure:** Uses `docker-compose.test.yml` for real services
- **Naming:** `TestUserService_CreateAndRetrieve`, `TestPaymentFlow_ChargeAndRefund`
- **Location:** `test/integration/` or equivalent
- **Coverage target:** All API endpoints, all database operations, all external service integrations

### Tier 3: Scenario Tests (End-to-End)
- **Scope:** Full user workflows across multiple components
- **Speed:** Seconds to minutes
- **Infrastructure:** Full stack via docker-compose
- **Naming:** `TestFullSignupFlow`, `TestCheckoutWithCouponAndPayment`
- **Location:** `test/scenarios/` or equivalent
- **Coverage target:** All critical user journeys, all UAT acceptance criteria

## Test Naming Convention

```
Test<Component>_<Behavior>[_<Condition>]
```

Examples:
- `TestAuthService_LoginWithValidCredentials`
- `TestOrderProcessor_ApplyDiscount_WhenBulkOrder`
- `TestFullRegistrationFlow`
- `TestAPIRateLimit_RejectsAfterThreshold`

**Do NOT use:**
- `TestGivenWhenThen` patterns
- `Test1`, `Test2` numbering
- `TestShouldDoSomething` verbose patterns

## Docker Test Harness

The `docker-compose.test.yml` file provides real services for integration and scenario tests:

```yaml
# Pattern: only test dependencies, not the app itself
services:
  test-db:
    image: postgres:16  # or mysql, mongo, etc.
    environment:
      POSTGRES_DB: testdb
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
    ports:
      - "5433:5432"  # Different port to avoid conflicts
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U test"]
      interval: 2s
      timeout: 5s
      retries: 5

  test-redis:
    image: redis:7
    ports:
      - "6380:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 2s
      timeout: 5s
      retries: 5
```

## Test Pyramid Execution Order

Always run in this order (fail fast):

1. **Unit tests** — fastest feedback, catch logic errors
2. **Docker harness up** — start test infrastructure
3. **Integration tests** — catch wiring/data errors
4. **Scenario tests** — catch workflow/UX errors
5. **Docker harness down** — cleanup

## Requirement Mapping

Every requirement in ROADMAP.md should map to at least one scenario test. Use `TEST_GUIDE.md` to maintain this mapping:

```
Requirement: "Users can sign up with email"
├── Unit: TestValidateEmail, TestHashPassword, TestGenerateToken
├── Integration: TestUserRepo_CreateUser, TestEmailService_SendVerification
└── Scenario: TestFullSignupFlow
```

## When to Skip Tiers

- **Pure config/infra changes:** No tests needed
- **Documentation only:** No tests needed
- **UI-only changes without logic:** Scenario tests may suffice
- **Internal refactoring:** Existing tests should still pass; add tests only if coverage gaps exist
