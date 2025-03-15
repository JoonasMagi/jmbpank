const axios = require('axios');
const CryptoService = require('./cryptoService');

class CentralBankService {
  constructor() {
    this.baseUrl = process.env.CENTRAL_BANK_URL || 'https://henno.cfd/central-bank';
    this.apiKey = process.env.API_KEY || '';
    this.testMode = process.env.TEST_MODE === 'true';
    
    console.log(`Central Bank Service initialized in ${this.testMode ? 'TEST' : 'PRODUCTION'} mode`);
    console.log(`Using Central Bank URL: ${this.baseUrl}`);
  }

  /**
   * Get bank information by bank prefix
   * @param {string} bankPrefix - The bank's 3-letter prefix
   * @returns {Promise<Object>} Bank information
   */
  async getBankInfo(bankPrefix) {
    try {
      console.log(`Getting bank info for prefix: ${bankPrefix}`);
      
      if (this.testMode) {
        console.log('TEST MODE: Returning mock bank info');
        return this._mockGetBankInfo(bankPrefix);
      }

      const response = await axios.get(`${this.baseUrl}/banks`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      console.log(`Bank info received:`, response.data);
      // Filter the bank information based on the bankPrefix
      const bankInfo = response.data.find(bank => bank.bankPrefix === bankPrefix);
      if (!bankInfo) {
        throw new Error(`Bank with prefix ${bankPrefix} not found`);
      }
      return bankInfo;
    } catch (error) {
      console.error('Error getting bank info:', error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
      throw new Error(`Failed to get bank information for ${bankPrefix}: ${error.message}`);
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
      console.log(`Sending transaction to bank: ${bankPrefix}`);
      
      const bankInfo = await this.getBankInfo(bankPrefix);
      console.log(`Got bank info:`, bankInfo);

      // Sign the transaction payload
      const payload = {
        accountFrom: transaction.accountFrom,
        accountTo: transaction.accountTo,
        currency: transaction.currency,
        amount: transaction.amount,
        explanation: transaction.explanation,
        senderName: transaction.senderName
      };

      console.log(`Payload to sign:`, payload);
      const token = await CryptoService.signPayload(payload);
      console.log(`JWT token generated with length: ${token.length}`);

      if (this.testMode) {
        console.log('TEST MODE: Simulating transaction send');
        return this._mockSendTransaction(bankInfo, token);
      }

      // Log real transaction attempt
      console.log(`Sending real transaction to: ${bankInfo.transactionUrl}`);
      
      // Send to destination bank
      const response = await axios.post(bankInfo.transactionUrl, {
        jwt: token
      });

      console.log(`Transaction response:`, response.data);
      return response.data;
    } catch (error) {
      console.error('Error sending transaction:', error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
      // Retry logic or fallback mechanism
      if (error.response && error.response.status >= 500) {
        console.log('Retrying transaction due to server error...');
        // Implement retry logic here
      }
      throw new Error(`Failed to send transaction: ${error.message}`);
    }
  }

  /**
   * Verify bank with central bank
   * @param {string} bankPrefix - The bank's 3-letter prefix
   * @returns {Promise<boolean>} True if bank is valid
   */
  async verifyBank(bankPrefix) {
    try {
      console.log(`Verifying bank: ${bankPrefix}`);
      
      if (this.testMode) {
        console.log('TEST MODE: Simulating bank verification');
        return this._mockVerifyBank(bankPrefix);
      }

      const response = await axios.get(`${this.baseUrl}/banks/${bankPrefix}/verify`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      console.log(`Bank verification response:`, response.data);
      return response.data.valid === true;
    } catch (error) {
      console.error('Error verifying bank:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
      }
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
      console.log(`Getting JWKS for bank: ${bankPrefix}`);
      
      const bankInfo = await this.getBankInfo(bankPrefix);
      console.log(`JWKS URL:`, bankInfo.jwksUrl);

      if (this.testMode) {
        console.log('TEST MODE: Returning mock JWKS');
        return this._mockGetJwks(bankPrefix);
      }

      const response = await axios.get(bankInfo.jwksUrl);
      console.log(`JWKS response received with ${response.data.keys?.length || 0} keys`);
      return response.data;
    } catch (error) {
      console.error('Error getting JWKS:', error.message);
      if (error.response) {
        console.error('Response status:', error.response.status);
      }
      throw new Error(`Failed to get JWKS for ${bankPrefix}: ${error.message}`);
    }
  }

  // Mock functions for test mode
  _mockGetBankInfo(bankPrefix) {
    // Return mock data for testing
    console.log(`Mock bank info for: ${bankPrefix}`);
    return {
      prefix: bankPrefix,
      name: `${bankPrefix} Test Bank`,
      transactionUrl: 'http://localhost:3000/api/transactions/b2b',
      jwksUrl: 'http://localhost:3000/api/transactions/jwks'
    };
  }

  _mockSendTransaction(bankInfo, token) {
    // Decode token to simulate processing
    console.log(`Mock sending transaction to: ${bankInfo.name}`);
    const payload = JSON.parse(
      Buffer.from(token.split('.')[1], 'base64').toString()
    );
    
    console.log(`Mock transaction payload:`, payload);

    // Return mock response
    return {
      receiverName: 'Test Receiver',
      message: 'Transaction processed in test mode'
    };
  }

  _mockVerifyBank(bankPrefix) {
    // Accept any 3-letter prefix in test mode
    console.log(`Mock verifying bank: ${bankPrefix}`);
    return bankPrefix && bankPrefix.length === 3;
  }

  _mockGetJwks(bankPrefix) {
    // Return our own JWKS for testing
    console.log(`Mock JWKS for bank: ${bankPrefix}`);
    return CryptoService.getJWKS();
  }
}

module.exports = new CentralBankService();