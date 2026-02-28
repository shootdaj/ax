# Component Index

## Directory Structure

```
project/
├── cmd/              # Entry points
├── internal/         # Private application code
│   ├── handler/      # HTTP handlers
│   ├── service/      # Business logic
│   ├── repository/   # Data access
│   └── model/        # Domain models
├── pkg/              # Public libraries
├── test/
│   ├── integration/  # Integration tests
│   └── scenarios/    # End-to-end tests
└── config/           # Configuration
```

_Replace with actual project structure._

## Components

### Component: _Name_

| Property | Value |
|---|---|
| **Location** | `path/to/component` |
| **Purpose** | _What it does_ |
| **Dependencies** | _What it depends on_ |
| **Depended on by** | _What depends on it_ |
| **Key files** | `file1.go`, `file2.go` |

### Component: _Name 2_

_Repeat for each major component._

## Shared Utilities

| Utility | Location | Purpose |
|---|---|---|
| _Name_ | `path` | _What it does_ |

## Configuration

| Config | Source | Required | Default |
|---|---|---|---|
| `DATABASE_URL` | env | Yes | - |
| `PORT` | env | No | `8080` |

---
_Last updated: Phase N_
