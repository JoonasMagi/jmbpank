# Error Codes Reference

This document describes the standardized error codes used throughout the JMB Pank application.

## User Authentication Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `AUTH_001` | Missing username and/or password | 400 |
| `AUTH_002` | Invalid credentials | 401 |
| `AUTH_003` | Unauthorized profile access | 401 |
| `AUTH_004` | Unauthorized logout attempt | 401 |
| `AUTH_SUCCESS` | Successful authentication operation | 200 |

## User Management Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `USER_001` | Username already exists | 400 |
| `USER_002` | Email already exists | 400 |
| `USER_003` | General constraint violation (username or email) | 400 |
| `USER_004` | User creation failed | 500 |
| `USER_NOT_FOUND` | Requested user was not found | 404 |

## Validation Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `VALIDATION_001` | Missing required fields | 400 |
| `VALIDATION_002` | Password too short (min 8 characters) | 400 |

## Database Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `DB_001` | General database error | 500 |

## Server Error Codes

| Code | Description | HTTP Status |
|------|-------------|-------------|
| `SERVER_001` | Unexpected error in register controller | 500 |
| `SERVER_002` | Unexpected error in login controller | 500 |
| `SERVER_003` | Error retrieving users list | 500 |
| `SERVER_004` | Error retrieving user profile | 500 |
| `SERVER_005` | Error during logout | 500 |

## Error Response Format

All error responses follow this standard format:

```json
{
  "error": "Human readable error message",
  "code": "ERROR_CODE",
  "status": 400,
  "timestamp": "2025-03-15T16:45:30.123Z",
  "details": {
    // Additional error-specific information
  }
}
```

### Details Field Examples

The `details` field will contain different information depending on the error:

#### Missing Fields (VALIDATION_001)
```json
"details": {
  "missingFields": ["username", "password"]
}
```

#### Password Too Short (VALIDATION_002)
```json
"details": {
  "field": "password",
  "reason": "too_short",
  "minLength": 8,
  "actualLength": 5
}
```

#### Username Already Exists (USER_001)
```json
"details": {
  "field": "username",
  "value": "johndoe"
}
```