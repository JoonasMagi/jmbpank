# Error Codes Reference

This document describes the standardized error codes used throughout the JMB Pank application. All error responses include HTTP status codes and descriptive messages for better debugging experience.

## User Authentication Error Codes

| Code | Description | HTTP Status | UI Message |
|------|-------------|-------------|------------|
| `AUTH_001` | Missing username and/or password | 400 | Username and password are required |
| `AUTH_002` | Invalid credentials | 401 | The username or password is incorrect |
| `AUTH_003` | Unauthorized profile access | 401 | You must be logged in to view your profile |
| `AUTH_004` | Unauthorized logout attempt | 401 | You must be logged in to log out |
| `AUTH_SUCCESS` | Successful authentication operation | 200 | Operation completed successfully |

## User Management Error Codes

| Code | Description | HTTP Status | UI Message |
|------|-------------|-------------|------------|
| `USER_001` | Username already exists | 400 | This username is already taken. Please choose another one. |
| `USER_002` | Email already exists | 400 | This email is already registered. Please use another email or reset your password. |
| `USER_003` | General constraint violation | 400 | Either the username or email is already in use |
| `USER_004` | User creation failed | 500 | Failed to create user account due to a server error |
| `USER_005` | User not found | 404 | The requested user account was not found |

## Validation Error Codes

| Code | Description | HTTP Status | UI Message |
|------|-------------|-------------|------------|
| `VALIDATION_001` | Missing required fields | 400 | Please fill in all required fields |
| `VALIDATION_002` | Password too short | 400 | Password must be at least 8 characters long |

## Database Error Codes

| Code | Description | HTTP Status | UI Message |
|------|-------------|-------------|------------|
| `DB_001` | General database error | 500 | A database error occurred. Please try again later. |

## Server Error Codes

| Code | Description | HTTP Status | UI Message |
|------|-------------|-------------|------------|
| `SERVER_001` | Unexpected error in register controller | 500 | An unexpected error occurred during registration |
| `SERVER_002` | Unexpected error in login controller | 500 | An unexpected error occurred during login |
| `SERVER_003` | Error retrieving users list | 500 | Failed to retrieve user list |
| `SERVER_004` | Error retrieving user profile | 500 | Failed to retrieve user profile |
| `SERVER_005` | Error during logout | 500 | Failed to log out |

## Error Response Format

All error responses follow this standard format:

```json
{
  "error": "Human readable error message",
  "code": "ERROR_CODE",
  "status": 400,
  "timestamp": "2025-03-15T16:45:30.123Z",
  "description": "Detailed error description for UI display",
  "details": {
    // Additional error-specific information
  }
}
```

## Logs Format

Error logs include the error code, HTTP status code, and detailed information:

```
[2025-03-15T17:29:52.433Z] ERROR: Registration failed [USER_001] Status: 400 - Username already exists: johndoe
```

### Example Error Scenarios

#### Username Already Exists (USER_001)
```json
{
  "error": "Username already exists",
  "code": "USER_001",
  "status": 400,
  "timestamp": "2025-03-15T16:45:30.123Z",
  "description": "The username is already taken by another user",
  "details": {
    "field": "username",
    "value": "johndoe"
  }
}
```

#### Missing Fields (VALIDATION_001)
```json
{
  "error": "All fields are required",
  "code": "VALIDATION_001",
  "status": 400,
  "timestamp": "2025-03-15T16:45:30.123Z",
  "description": "Please fill in all required fields",
  "details": {
    "missingFields": ["username", "password"]
  }
}
```

#### Password Too Short (VALIDATION_002)
```json
{
  "error": "Password must be at least 8 characters",
  "code": "VALIDATION_002",
  "status": 400,
  "timestamp": "2025-03-15T16:45:30.123Z",
  "description": "Password must be at least 8 characters long",
  "details": {
    "field": "password",
    "reason": "too_short",
    "minLength": 8,
    "actualLength": 5
  }
}
```