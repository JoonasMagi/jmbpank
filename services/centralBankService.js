const axios = require('axios');
const CryptoService = require('./cryptoService');

class CentralBankService {
  constructor() {
    this.baseUrl = process.env.CENTRAL_BANK_URL || 'https://keskpank.com/api';
    this.apiKey = process.env.API_KEY || '';
    this.testMode = process.env.TEST_MODE === 'true';
  }

  /**
   * Get bank information by bank prefix
   * @param {string} bankPrefix - The bank's 3-letter prefix
   * @returns {Promise<Object>} Bank information
   */
  async getBankInfo(bankPrefix) {
    try {
      if (this.testMode) {
        return this._mockGetBankInfo(bankPrefix);
      }

      const response = await axios.get(`${this.baseUrl}/banks/${bankPrefix}`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error getting bank info:', error.message);
      throw new Error('Failed to get bank information');
    }
  }

  /**
   * Send transaction to another bank
   * @param {Object} transaction - Transaction data
   * @returns {Promise<Object>} Response with receiver name if successful
   */
  async sendTransaction(transaction) {
    try {
      // Get destination bank info based on first 3 chars of accountTo
      const bankPrefix = transaction.accountTo.substring(0, 3);
      const bankInfo = await this.getBankInfo(bankPrefix);

      // Sign the transaction payload
      const payload = {
        accountFrom: transaction.accountFrom,
        accountTo: transaction.accountTo,
        currency: transaction.currency,
        amount: transaction.amount,
        explanation: transaction.explanation,
        senderName: transaction.senderName
      };

      const token = await CryptoService.signPayload(payload);

      if (this.testMode) {
        return this._mockSendTransaction(bankInfo, token);
      }

      // Send to destination bank
      const response = await axios.post(`${bankInfo.transactionUrl}`, {
        jwt: token
      });

      return response.data;
    } catch (error) {
      console.error('Error sending transaction:', error);
      throw new Error('Failed to send transaction to destination bank');
    }
  }

  /**
   * Verify bank with central bank
   * @param {string} bankPrefix - The bank's 3-letter prefix
   * @returns {Promise<boolean>} True if bank is valid
   */
  async verifyBank(bankPrefix) {
    try {
      if (this.testMode) {
        return this._mockVerifyBank(bankPrefix);
      }

      const response = await axios.get(`${this.baseUrl}/banks/${bankPrefix}/verify`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      return response.data.valid === true;
    } catch (error) {
      console.error('Error verifying bank:', error.message);
      return false;
    }
  }

  /**
   * Get JWKS from another bank
   * @param {string} bankPrefix - The bank's 3-letter prefix
   * @returns {Promise<Object>} JWKS data
   */
  async getJwks(bankPrefix) {
    try {
      const bankInfo = await this.getBankInfo(bankPrefix);

      if (this.testMode) {
        return this._mockGetJwks(bankPrefix);
      }

      const response = await axios.get(bankInfo.jwksUrl);
      return response.data;
    } catch (error) {
      console.error('Error getting JWKS:', error.message);
      throw new Error('Failed to get JWKS');
    }
  }

  // Mock functions for test mode
  _mockGetBankInfo(bankPrefix) {
    // Return mock data for testing
    return {
      prefix: bankPrefix,
      name: `${bankPrefix} Test Bank`,
      transactionUrl: 'http://localhost:3000/transactions/b2b',
      jwksUrl: 'http://localhost:3000/transactions/jwks'
    };
  }

  _mockSendTransaction(bankInfo, token) {
    // Decode token to simulate processing
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64').toString()
    );

    // Return mock response
    return {
      receiverName: 'Test Receiver'
    };
  }

  _mockVerifyBank(bankPrefix) {
    // Accept any 3-letter prefix in test mode
    return bankPrefix && bankPrefix.length === 3;
  }

  _mockGetJwks(bankPrefix) {
    // Return our own JWKS for testing
    return CryptoService.getJWKS();
  }
}

module.exports = new CentralBankService();