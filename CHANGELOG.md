# Changelog

## [Unreleased]

### Added
- Enhanced error logging with properly serialized error objects
- Added HTTP status codes to all error logs
- Added description field to error objects for UI display
- Improved log viewer with error code highlighting and filtering
- Added visual error code and HTTP status indicators in log viewer
- Added proper error serialization for better debugging

### Fixed
- Fixed `[object Object]` showing in error logs instead of actual data
- Added fallback to String conversion for non-JSON serializable error objects
- Improved error code documentation with UI messages and examples
- Fixed database error details handling

### Changed
- Improved error format in all error responses
- Updated error codes to include descriptions
- Enhanced log format for better readability
- Improved error documentation with HTTP status codes

## [1.0.1] - 2025-03-15

### Fixed
- Issue where "username already exists" error was displayed but user was still created
- Race condition in user creation between checking for existing username and inserting record
- More specific error messages for email and username uniqueness violations
- Better error responses in API with appropriate HTTP status codes

### Added
- Standardized error codes across the application
- Enhanced error responses with timestamps and detailed information
- Improved logging with error codes and structured error details
- More specific error handling for database constraint violations
- Added documentation for error codes in `docs/ERROR_CODES.md`

## [1.0.0] - Initial Release

### Added
- Basic banking functionality
- User authentication
- Account management
- Transaction processing
- Interbank transfers
- JWT-based authentication
- Documentation with Swagger UI