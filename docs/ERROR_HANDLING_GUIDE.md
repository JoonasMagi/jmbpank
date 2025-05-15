# Error Handling Guide

This guide explains how to properly use the error handling system in the JMB Pank application.

## Creating New Errors

### In Models

When creating errors in model files, use the `createError` helper function:

```javascript
// Example from models/user.js
const error = createError('USERNAME_EXISTS', { field: 'username', value: username });
throw error;
```

To add a new error type, add it to the `ErrorCodes` object:

```javascript
const ErrorCodes = {
  // Existing codes...
  NEW_ERROR_TYPE: {
    code: 'USER_006',
    message: 'Human readable error message',
    description: 'More detailed description for UI display',
    status: 400 // HTTP status code
  }
};
```

### In Controllers

When catching and returning errors in controllers, use this pattern:

```javascript
try {
  // Operation that may fail
} catch (error) {
  console.error(`Operation failed [${error.code || 'UNKNOWN'}] Status: ${error.status || 500} - ${error.message}`, {
    details: error.details ? JSON.stringify(error.details) : null
  });
  
  const errorResponse = {
    error: error.message || 'An error occurred',
    code: error.code || 'SERVER_ERROR',
    status: error.status || 500,
    timestamp: new Date().toISOString(),
    description: error.description || 'An unexpected error occurred',
    details: error.details || {}
  };
  
  return res.status(errorResponse.status).json(errorResponse);
}
```

## Logging Best Practices

1. Always include the error code in square brackets: `[USER_001]`
2. Always include the HTTP status code: `Status: 400`
3. Use structured JSON for complex error details: `JSON.stringify(details, null, 2)`
4. Convert non-serializable error properties to strings: `String(error.originalError)`

Example log format:
```
Error during operation [USER_001] Status: 400 - Username already exists: johndoe
```

## Error Categories

Organize error codes by feature area:

- `USER_XXX` - User management errors
- `AUTH_XXX` - Authentication errors
- `VALIDATION_XXX` - Input validation errors
- `DB_XXX` - Database errors
- `SERVER_XXX` - General server errors

## Updating Error Documentation

When adding new error codes, always update the error code documentation:

1. Add the new code to `docs/ERROR_CODES.md`
2. Include:
   - Error code
   - HTTP status code
   - Description
   - UI message (user-friendly version)
   - Example of error response format

## Testing Error Handling

Use the log viewer at `/api/logs/viewer` to verify errors are being correctly logged.

Try to trigger various error conditions and check that:
1. The correct error code is used
2. The HTTP status code makes sense for the error
3. The error details provide enough context
4. The error is properly displayed in the log viewer

## Common Error Patterns

### Validation Errors
```javascript
const errorResponse = {
  error: 'All fields are required',
  code: 'VALIDATION_001',
  status: 400,
  timestamp: new Date().toISOString(),
  description: 'Please fill in all required fields',
  details: { missingFields: ['username', 'password'] }
};
```

### Resource Not Found
```javascript
const errorResponse = {
  error: 'User not found',
  code: 'USER_NOT_FOUND', 
  status: 404,
  timestamp: new Date().toISOString(),
  description: 'The requested user could not be found',
  details: { username: requestedUsername }
};
```

### Authentication Errors
```javascript
const errorResponse = {
  error: 'Invalid credentials',
  code: 'AUTH_002',
  status: 401,
  timestamp: new Date().toISOString(),
  description: 'The username or password is incorrect',
  details: {}
};
```