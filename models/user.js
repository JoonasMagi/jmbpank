const { query, run, get } = require('./db');
const crypto = require('crypto');

// Define error codes with descriptions for better logging and UI display
const ErrorCodes = {
  USERNAME_EXISTS: {
    code: 'USER_001',
    message: 'Username already exists',
    description: 'The username is already taken by another user',
    status: 400,
  },
  EMAIL_EXISTS: {
    code: 'USER_002',
    message: 'Email already exists',
    description: 'The email address is already registered',
    status: 400,
  },
  CONSTRAINT_VIOLATION: {
    code: 'USER_003',
    message: 'Username or email already exists',
    description: 'Either the username or email is already in use',
    status: 400,
  },
  CREATION_FAILED: {
    code: 'USER_004',
    message: 'Failed to create user',
    description: 'Could not create user due to a database error',
    status: 500,
  },
  DATABASE_ERROR: {
    code: 'DB_001',
    message: 'Database error occurred',
    description: 'An unexpected database error occurred',
    status: 500,
  },
  USER_NOT_FOUND: {
    code: 'USER_005',
    message: 'User not found',
    description: 'The requested user was not found in the database',
    status: 404,
  },
};

// Helper to create standardized error objects
function createError(errorType, additionalDetails = {}) {
  const errorInfo = ErrorCodes[errorType];
  const error = new Error(errorInfo.message);
  error.code = errorInfo.code;
  error.status = errorInfo.status;
  error.description = errorInfo.description;
  error.details = additionalDetails;

  return error;
}

class User {
  /**
   * Create a new user
   * @param {string} username - Username
   * @param {string} password - Plain text password
   * @param {string} fullName - User's full name
   * @param {string} email - User's email
   * @returns {Promise<Object>} Created user without password
   */
  static async create(username, password, fullName, email) {
    try {
      // First check if username already exists to avoid race condition
      const existingUser = await this.getByUsername(username);
      if (existingUser) {
        throw createError('USERNAME_EXISTS', { field: 'username', value: username });
      }

      // Hash the password
      const salt = crypto.randomBytes(16).toString('hex');
      const passwordHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');

      // Create user
      const result = await run(
        `INSERT INTO users (
          username, 
          password_hash, 
          password_salt, 
          full_name, 
          email
        ) VALUES (?, ?, ?, ?, ?)`,
        [username, passwordHash, salt, fullName, email]
      );

      if (result.id) {
        const user = await this.getByUsername(username);
        return this.excludePassword(user);
      }

      throw createError('CREATION_FAILED', { operation: 'database_insert' });
    } catch (error) {
      // If error already has our custom format, just throw it
      if (error.code && error.description) {
        throw error;
      }

      // Handle SQLite constraint violation (username/email unique constraint)
      if (error.code === 'SQLITE_CONSTRAINT') {
        if (error.message && error.message.includes('UNIQUE constraint failed: users.username')) {
          throw createError('USERNAME_EXISTS', { field: 'username', value: username });
        } else if (
          error.message &&
          error.message.includes('UNIQUE constraint failed: users.email')
        ) {
          throw createError('EMAIL_EXISTS', { field: 'email', value: email });
        } else {
          throw createError('CONSTRAINT_VIOLATION', {
            fields: ['username', 'email'],
            values: [username, email],
            originalError: String(error.message),
          });
        }
      }

      // General database error
      const dbError = createError('DATABASE_ERROR', {
        message: error.message,
        originalError: String(error.message || error),
      });

      throw dbError;
    }
  }

  /**
   * Get user by username
   * @param {string} username - Username
   * @returns {Promise<Object|null>} User or null if not found
   */
  static async getByUsername(username) {
    try {
      const user = await get('SELECT * FROM users WHERE username = ?', [username]);
      return user || null;
    } catch (error) {
      throw createError('DATABASE_ERROR', {
        operation: 'get_user_by_username',
        username: username,
        message: error.message,
        originalError: String(error.message || error),
      });
    }
  }

  /**
   * Validate user credentials
   * @param {string} username - Username
   * @param {string} password - Plain text password
   * @returns {Promise<Object|null>} User without password if valid, null otherwise
   */
  static async validateCredentials(username, password) {
    try {
      const user = await this.getByUsername(username);

      if (!user) {
        return null;
      }

      const hashedPassword = crypto
        .pbkdf2Sync(password, user.password_salt, 1000, 64, 'sha512')
        .toString('hex');

      if (hashedPassword === user.password_hash) {
        return this.excludePassword(user);
      }

      return null;
    } catch (error) {
      // Pass through our custom errors
      if (error.code && error.description) {
        throw error;
      }

      throw createError('DATABASE_ERROR', {
        operation: 'validate_credentials',
        username: username,
        message: error.message,
        originalError: String(error.message || error),
      });
    }
  }

  /**
   * Get all users
   * @returns {Promise<Array>} List of users without passwords
   */
  static async getAll() {
    try {
      const users = await query('SELECT * FROM users');
      return users.map(user => this.excludePassword(user));
    } catch (error) {
      throw createError('DATABASE_ERROR', {
        operation: 'get_all_users',
        message: error.message,
        originalError: String(error.message || error),
      });
    }
  }

  /**
   * Remove sensitive fields from user object
   * @param {Object} user - User object
   * @returns {Object} User without sensitive fields
   */
  static excludePassword(user) {
    if (!user) return null;

    const { password_hash, password_salt, ...safeUser } = user;
    return safeUser;
  }
}

// Export error codes and helper for use in controllers
User.ErrorCodes = ErrorCodes;
User.createError = createError;

module.exports = User;
