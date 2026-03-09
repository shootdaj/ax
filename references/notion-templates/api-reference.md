# API Reference

## Base URL

```
{{BASE_URL}}
```

## Authentication

_Describe auth mechanism (Bearer token, API key, etc.)_

## Endpoints

### Resource: _Name_

#### `GET /resource`
List all resources.

**Query Parameters:**
| Parameter | Type | Required | Description |
|---|---|---|---|
| `limit` | integer | No | Max items (default: 20) |
| `offset` | integer | No | Pagination offset |

**Response:** `200 OK`
```json
{
  "data": [],
  "total": 0,
  "limit": 20,
  "offset": 0
}
```

#### `POST /resource`
Create a new resource.

**Request Body:**
```json
{
  "name": "string (required)",
  "description": "string (optional)"
}
```

**Response:** `201 Created`

#### `GET /resource/:id`
Get a single resource.

**Response:** `200 OK`

#### `PUT /resource/:id`
Update a resource.

**Response:** `200 OK`

#### `DELETE /resource/:id`
Delete a resource.

**Response:** `204 No Content`

## Error Responses

All errors follow this format:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

| Code | HTTP Status | Description |
|---|---|---|
| `UNAUTHORIZED` | 401 | Missing or invalid auth |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `VALIDATION_ERROR` | 422 | Invalid request body |
| `INTERNAL_ERROR` | 500 | Server error |

---
_Last updated: Phase N_
