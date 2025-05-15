const { query, run, get } = require('./db');
const { v4: uuidv4 } = require('uuid');
const Account = require('./account');

class Transaction {
  /**
   * Create a new transaction record
   * @param {Object} data - Transaction data
   * @returns {Promise<Object>} Created transaction
   */
  static async create(data) {
    const {
      accountFrom,
      accountTo,
      amount,
      currency = 'EUR',
      explanation = '',
      senderName,
      receiverName = null,
      status = 'pending',
    } = data;

    const transactionId = uuidv4();

    const result = await run(
      `INSERT INTO transactions (
        transaction_id,
        account_from,
        account_to,
        amount,
        currency, 
        explanation,
        sender_name,
        receiver_name,
        status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        transactionId,
        accountFrom,
        accountTo,
        amount,
        currency,
        explanation,
        senderName,
        receiverName,
        status,
      ]
    );

    if (result.id) {
      return this.getByTransactionId(transactionId);
    }

    throw new Error('Failed to create transaction');
  }

  /**
   * Get transaction by ID
   * @param {string} transactionId - The transaction ID
   * @returns {Promise<Object|null>} Transaction or null if not found
   */
  static async getByTransactionId(transactionId) {
    try {
      const transaction = await get('SELECT * FROM transactions WHERE transaction_id = ?', [
        transactionId,
      ]);
      return transaction || null;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get all transactions for an account (both sender and receiver)
   * @param {string} accountNumber - The account number
   * @returns {Promise<Array>} List of transactions
   */
  static async getByAccount(accountNumber) {
    try {
      const transactions = await query(
        'SELECT * FROM transactions WHERE account_from = ? OR account_to = ? ORDER BY created_at DESC',
        [accountNumber, accountNumber]
      );
      return transactions;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Update transaction status
   * @param {string} transactionId - The transaction ID
   * @param {string} status - New status
   * @param {string} receiverName - Optional receiver name
   * @returns {Promise<boolean>} True if successful
   */
  static async updateStatus(transactionId, status, receiverName = null) {
    try {
      const params = [status];
      let sql = 'UPDATE transactions SET status = ?';

      if (receiverName) {
        sql += ', receiver_name = ?';
        params.push(receiverName);
      }

      sql += ' WHERE transaction_id = ?';
      params.push(transactionId);

      const result = await run(sql, params);
      return result.changes > 0;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Execute a local transaction between accounts in this bank
   * @param {string} fromAccount - Sender account number
   * @param {string} toAccount - Receiver account number
   * @param {number} amount - Amount to transfer
   * @param {string} currency - Currency
   * @param {string} explanation - Transaction explanation
   * @param {string} senderName - Name of the sender
   * @returns {Promise<Object>} Completed transaction
   */
  static async executeLocalTransaction(
    fromAccount,
    toAccount,
    amount,
    currency,
    explanation,
    senderName
  ) {
    try {
      // Verify sender account and sufficient funds
      const senderAccount = await Account.getByAccountNumber(fromAccount);
      if (!senderAccount) {
        throw new Error('Sender account not found');
      }

      if (senderAccount.balance < amount) {
        throw new Error('Insufficient funds');
      }

      // Verify receiver account
      const receiverAccount = await Account.getByAccountNumber(toAccount);
      if (!receiverAccount) {
        throw new Error('Receiver account not found');
      }

      // Create transaction record
      const transaction = await this.create({
        accountFrom: fromAccount,
        accountTo: toAccount,
        amount,
        currency,
        explanation,
        senderName,
        receiverName: receiverAccount.owner_name,
        status: 'processing',
      });

      // Update account balances
      await Account.updateBalance(fromAccount, -amount);
      await Account.updateBalance(toAccount, amount);

      // Update transaction status
      await this.updateStatus(transaction.transaction_id, 'completed', receiverAccount.owner_name);

      // Return completed transaction
      return this.getByTransactionId(transaction.transaction_id);
    } catch (error) {
      throw error;
    }
  }
}

module.exports = Transaction;
