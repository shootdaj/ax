# Data Flow

## Request Lifecycle

_How a typical request flows through the system from client to response._

```
Client Request
  → Router
    → Middleware (auth, logging, rate limit)
      → Handler
        → Service Layer
          → Repository / External Service
        ← Response
      ← Middleware (response transform)
    ← Router
  ← Client Response
```

## Key Flows

### Authentication Flow

```
1. Client sends credentials
2. Auth service validates
3. Token generated and returned
4. Subsequent requests include token
5. Middleware validates token per request
```

### Data Write Flow

```
1. Request validated at handler
2. Business logic in service layer
3. Transaction opened
4. Data persisted via repository
5. Cache invalidated
6. Event emitted (if applicable)
7. Transaction committed
8. Response returned
```

### Data Read Flow

```
1. Request parsed at handler
2. Cache checked first
3. If miss: query repository
4. Result cached
5. Response returned
```

## External Integrations

| Service | Direction | Protocol | Purpose |
|---|---|---|---|
| _Service_ | Inbound/Outbound | REST/gRPC/WebSocket | _Purpose_ |

## Event System

_If applicable: how events/messages flow between components._

---
_Last updated: Phase N_
