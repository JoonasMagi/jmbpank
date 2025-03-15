# Changelog

## [Unreleased]

### Added
- Standardized error codes across the application
- Enhanced error responses with timestamps and detailed information
- Improved logging with error codes and structured error details
- More specific error handling for database constraint violations

### Fixed
- Issue where "username already exists" error was displayed but user was still created
- Race condition in user creation between checking for existing username and inserting record
- More specific error messages for email and username uniqueness violations
- Better error responses in API with appropriate HTTP status codes

## [1.0.0] - Initial Release

### Added
- Basic banking functionality
- User authentication
- Account management
- Transaction processing
- Interbank transfers
- JWT-based authentication
- Documentation with Swagger UI