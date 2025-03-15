const Transaction = require('../models/transaction');
const Account = require('../models/account');
const CentralBankService = require('./centralBankService');
const CryptoService = require('./cryptoService');

class TransactionService {
  /**
   * Process a bank-to-bank transaction
   * @param {Object} transactionData - Transaction data
   * @returns {Promise<Object>} Transaction result
   */
  static async processOutgoingB2BTransaction(transactionData) {
    try {
      const { 
        accountFrom, 
        accountTo, 
        amount, 
        currency = 'EUR', 
        explanation = '',
        senderName
      } = transactionData;
      
      // Check if sender account exists and has sufficient funds
      const senderAccount = await Account.getByAccountNumber(accountFrom);
      if (!senderAccount) {
        throw new Error('Sender account not found');
      }
      
      if (senderAccount.balance < amount) {
        throw new Error('Insufficient funds');
      }
      
      // Create pending transaction in database
      const transaction = await Transaction.create({
        accountFrom,
        accountTo,
        amount,
        currency,
        explanation,
        senderName: senderName || senderAccount.owner_name,
        status: 'pending'
      });
      
      // Check if destination account is in our bank
      const localAccount = await Account.getByAccountNumber(accountTo);
      if (localAccount) {
        // Process as local transaction
        return Transaction.executeLocalTransaction(
          accountFrom,
          accountTo,
          amount,
          currency,
          explanation,
          senderName || senderAccount.owner_name
        );
      }
      
      // Process as inter-bank transaction
      const response = await CentralBankService.sendTransaction({
        accountFrom,
        accountTo,
        amount,
        currency,
        explanation,
        senderName: senderName || senderAccount.owner_name
      });
      
      // Update transaction with received information
      await Transaction.updateStatus(
        transaction.transaction_id, 
        'completed', 
        response.receiverName
      );
      
      // Debit sender's account
      await Account.updateBalance(accountFrom, -amount);
      
      return {
        ...transaction,
        status: 'completed',
        receiver_name: response.receiverName
      };
    } catch (error) {
      console.error('Transaction processing error:', error);
      throw error;
    }
  }

  /**
   * Process incoming B2B transaction
   * @param {string} jwt - JWT token containing transaction data
   * @returns {Promise<Object>} Receiver information
   */
  static async processIncomingB2BTransaction(jwt) {
    try {
      // Extract JWT header to get issuer bank prefix
      const jwtParts = jwt.split('.');
      const header = JSON.parse(Buffer.from(jwtParts[0], 'base64').toString());
      
      // Get payload without verifying yet
      const payload = JSON.parse(Buffer.from(jwtParts[1], 'base64').toString());
      
      // Verify receiving account exists
      const receiverAccount = await Account.getByAccountNumber(payload.accountTo);
      if (!receiverAccount) {
        throw new Error('Receiver account not found');
      }
      
      // Extract bank prefix from sender account
      const senderBankPrefix = payload.accountFrom.substring(0, 3);
      
      // Verify sending bank with Central Bank
      const isValidBank = await CentralBankService.verifyBank(senderBankPrefix);
      if (!isValidBank) {
        throw new Error('Invalid sender bank');
      }
      
      // Get sender bank's JWKS
      const jwks = await CentralBankService.getJwks(senderBankPrefix);
      
      // Find the key that matches the kid in the JWT header
      const key = jwks.keys.find(k => k.kid === header.kid);
      if (!key) {
        throw new Error('No matching key found in JWKS');
      }
      
      // Convert JWK to PEM format for verification
      const publicKey = CryptoService.jwkToPem(key);
      
      // Verify JWT signature
      const decodedPayload = CryptoService.verifyToken(jwt, publicKey);
      if (!decodedPayload) {
        throw new Error('Invalid JWT signature');
      }
      
      // Create transaction record
      const transaction = await Transaction.create({
        accountFrom: decodedPayload.accountFrom,
        accountTo: decodedPayload.accountTo,
        amount: decodedPayload.amount,
        currency: decodedPayload.currency,
        explanation: decodedPayload.explanation,
        senderName: decodedPayload.senderName,
        receiverName: receiverAccount.owner_name,
        status: 'processing'
      });
      
      // Credit receiver's account
      await Account.updateBalance(decodedPayload.accountTo, decodedPayload.amount);
      
      // Update transaction status
      await Transaction.updateStatus(
        transaction.transaction_id, 
        'completed', 
        receiverAccount.owner_name
      );
      
      // Return receiver information
      return {
        receiverName: receiverAccount.owner_name,
        status: 'completed'
      };
    } catch (error) {
      console.error('Incoming transaction processing error:', error);
      throw error;
    }
  }
}

module.exports = TransactionService;