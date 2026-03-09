# Deployment

## Environments

| Environment | URL | Branch | Auto-deploy |
|---|---|---|---|
| Development | `localhost:{{PORT}}` | feature branches | N/A |
| Staging | _TBD_ | `main` | Yes |
| Production | _TBD_ | tagged releases | Manual |

## Prerequisites

- Docker and Docker Compose
- Access to container registry (if applicable)
- Environment variables configured

## Local Development

```bash
# Clone and setup
git clone {{REPO_URL}}
cd {{PROJECT_NAME}}
{{INSTALL_COMMAND}}

# Start dependencies
docker compose up -d

# Run application
{{RUN_COMMAND}}
```

## Build

```bash
{{BUILD_COMMAND}}
```

## Deploy

### Staging
_Automatic on merge to `main`._

### Production
```bash
# Tag a release
git tag v{{VERSION}}
git push origin v{{VERSION}}

# Deploy (method depends on infrastructure)
{{DEPLOY_COMMAND}}
```

## Environment Variables

| Variable | Required | Description | Example |
|---|---|---|---|
| `DATABASE_URL` | Yes | Database connection string | `postgres://...` |
| `PORT` | No | Server port | `8080` |

## Health Checks

| Endpoint | Expected | Purpose |
|---|---|---|
| `GET /health` | `200 OK` | Basic liveness |
| `GET /ready` | `200 OK` | Readiness (DB connected) |

## Rollback

```bash
# Revert to previous version
{{ROLLBACK_COMMAND}}
```

## Monitoring

_Links to monitoring dashboards, log aggregation, alerting._

---
_Last updated: Phase N_
