const { query, run, get } = require('./db');
const crypto = require('crypto');

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
      
      throw new Error('Failed to create user');
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT') {
        throw new Error('Username already exists');
      }
      throw error;
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
      throw error;
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
      throw error;
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
      throw error;
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

module.exports = User;