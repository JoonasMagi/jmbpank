const { query, run, get } = require('./db');
const crypto = require('crypto');

// Define error codes for better error handling
const ErrorCodes = {
  USERNAME_EXISTS: 'USER_001',
  EMAIL_EXISTS: 'USER_002',
  CONSTRAINT_VIOLATION: 'USER_003',
  CREATION_FAILED: 'USER_004',
  DATABASE_ERROR: 'DB_001'
};

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
        const error = new Error('Username already exists');
        error.code = ErrorCodes.USERNAME_EXISTS;
        error.status = 400;
        error.details = { field: 'username', value: username };
        throw error;
      }
      
      // Hash the password
      const salt = crypto.randomBytes(16).toString('hex');
      const passwordHash = crypto
        .pbkdf2Sync(password, salt, 1000, 64, 'sha512')
        .toString('hex');
      
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
      
      const error = new Error('Failed to create user');
      error.code = ErrorCodes.CREATION_FAILED;
      error.status = 500;
      error.details = { operation: 'database_insert' };
      throw error;
    } catch (error) {
      // If error already has our custom format, just throw it
      if (error.code && error.code.startsWith('USER_')) {
        throw error;
      }
      
      // Handle SQLite constraint violation (username/email unique constraint)
      if (error.code === 'SQLITE_CONSTRAINT') {
        let constraintError;
        
        // Check if it's a username or email constraint
        if (error.message && error.message.includes('UNIQUE constraint failed: users.username')) {
          constraintError = new Error('Username already exists');
          constraintError.code = ErrorCodes.USERNAME_EXISTS;
          constraintError.details = { field: 'username', value: username };
        } else if (error.message && error.message.includes('UNIQUE constraint failed: users.email')) {
          constraintError = new Error('Email already exists');
          constraintError.code = ErrorCodes.EMAIL_EXISTS;
          constraintError.details = { field: 'email', value: email };
        } else {
          constraintError = new Error('Username or email already exists');
          constraintError.code = ErrorCodes.CONSTRAINT_VIOLATION;
          constraintError.details = { fields: ['username', 'email'], values: [username, email] };
        }
        
        constraintError.status = 400;
        constraintError.originalError = error.message;
        throw constraintError;
      }
      
      // General database error
      const dbError = new Error(error.message || 'Database error occurred');
      dbError.code = ErrorCodes.DATABASE_ERROR;
      dbError.status = 500;
      dbError.originalError = error;
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
      const dbError = new Error('Error retrieving user');
      dbError.code = ErrorCodes.DATABASE_ERROR;
      dbError.status = 500;
      dbError.originalError = error;
      throw dbError;
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
      if (error.code) {
        throw error;
      }
      
      const dbError = new Error('Error validating credentials');
      dbError.code = ErrorCodes.DATABASE_ERROR;
      dbError.status = 500;
      dbError.originalError = error;
      throw dbError;
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
      const dbError = new Error('Error retrieving users');
      dbError.code = ErrorCodes.DATABASE_ERROR;
      dbError.status = 500;
      dbError.originalError = error;
      throw dbError;
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

// Export error codes for use in controllers
User.ErrorCodes = ErrorCodes;

module.exports = User;