const { query, run, get } = require('./db');
const { v4: uuidv4 } = require('uuid');

class Account {
  /**
   * Create a new account
   * @param {Object} params - Account parameters
   * @param {number} params.userId - User ID who owns this account
   * @param {string} params.ownerName - The name of the account owner
   * @param {string} params.accountType - The type of account (checking, savings)
   * @param {string} params.currency - The currency of the account (default: EUR)
   * @param {number} params.initialBalance - Initial balance (default: 0)
   * @returns {Promise<Object>} Created account
   */
  static async create({ userId, ownerName, accountType = 'checking', currency = 'EUR', initialBalance = 0 }) {
    // Generate account number with bank prefix
    const bankPrefix = process.env.BANK_PREFIX || 'JMB';
    // Use first 3 chars of UUID (no dashes) and add a random 6 digits
    const accountNumber = `${bankPrefix}${uuidv4().replace(/-/g, '').substring(0, 20)}`;
    
    try {
      const result = await run(
        'INSERT INTO accounts (account_number, user_id, owner_name, account_type, balance, currency) VALUES (?, ?, ?, ?, ?, ?)',
        [accountNumber, userId, ownerName, accountType, initialBalance, currency]
      );
      
      if (result.lastID) {
        return this.getByAccountNumber(accountNumber);
      }
      
      throw new Error('Failed to create account');
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get account by account number
   * @param {string} accountNumber - The account number
   * @returns {Promise<Object|null>} Account or null if not found
   */
  static async getByAccountNumber(accountNumber) {
    try {
      const account = await get('SELECT * FROM accounts WHERE account_number = ?', [accountNumber]);
      return account || null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get accounts by user ID
   * @param {number} userId - The user ID
   * @returns {Promise<Array>} List of user accounts
   */
  static async getByUserId(userId) {
    try {
      const accounts = await query('SELECT * FROM accounts WHERE user_id = ?', [userId]);
      return accounts;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all accounts
   * @returns {Promise<Array>} List of accounts
   */
  static async getAll() {
    try {
      const accounts = await query('SELECT * FROM accounts');
      return accounts;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update account balance
   * @param {string} accountNumber - The account number
   * @param {number} amount - Amount to add (positive) or subtract (negative)
   * @returns {Promise<boolean>} True if successful, throws error otherwise
   */
  static async updateBalance(accountNumber, amount) {
    try {
      // Get current account
      const account = await this.getByAccountNumber(accountNumber);
      if (!account) {
        throw new Error('Account not found');
      }
      
      // Calculate new balance
      const newBalance = account.balance + amount;
      
      // Don't allow negative balance
      if (newBalance < 0) {
        throw new Error('Insufficient funds');
      }
      
      // Update balance
      const result = await run(
        'UPDATE accounts SET balance = ? WHERE account_number = ?',
        [newBalance, accountNumber]
      );
      
      return result.changes > 0;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Check if an account has sufficient funds
   * @param {string} accountNumber - The account number
   * @param {number} amount - Amount to check
   * @returns {Promise<boolean>} True if has sufficient funds
   */
  static async hasSufficientFunds(accountNumber, amount) {
    try {
      const account = await this.getByAccountNumber(accountNumber);
      if (!account) {
        return false;
      }
      
      return account.balance >= amount;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Account;