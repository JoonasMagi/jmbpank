const forge = require('node-forge');
const jwt = require('jsonwebtoken');
const { run, get, query } = require('../models/db');

class CryptoService {
  /**
   * Generate RSA key pair
   * @returns {Object} Object containing public and private keys
   */
  static generateKeyPair() {
    const keys = forge.pki.rsa.generateKeyPair({ bits: 2048 });
    
    const publicKey = forge.pki.publicKeyToPem(keys.publicKey);
    const privateKey = forge.pki.privateKeyToPem(keys.privateKey);
    
    return {
      publicKey,
      privateKey
    };
  }

  /**
   * Store RSA key pair in database
   * @param {string} keyId - The key identifier
   * @returns {Promise<Object>} Stored key pair
   */
  static async createAndStoreKeyPair(keyId = '1') {
    try {
      // Check if key already exists
      const existingKey = await get('SELECT * FROM keys WHERE key_id = ?', [keyId]);
      
      if (existingKey) {
        return {
          keyId,
          publicKey: existingKey.public_key,
          privateKey: existingKey.private_key
        };
      }
      
      // Generate new key pair
      const { publicKey, privateKey } = this.generateKeyPair();
      
      // Store in database
      await run(
        'INSERT INTO keys (key_id, public_key, private_key) VALUES (?, ?, ?)',
        [keyId, publicKey, privateKey]
      );
      
      return { keyId, publicKey, privateKey };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get active key pair
   * @returns {Promise<Object>} Active key pair
   */
  static async getActiveKeyPair() {
    try {
      const key = await get('SELECT * FROM keys WHERE active = 1 LIMIT 1');
      
      if (!key) {
        // Create default key pair if none exists
        return this.createAndStoreKeyPair('1');
      }
      
      return {
        keyId: key.key_id,
        publicKey: key.public_key,
        privateKey: key.private_key
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Sign payload with private key
   * @param {Object} payload - Data to sign
   * @returns {Promise<string>} JWT token
   */
  static async signPayload(payload) {
    try {
      const { keyId, privateKey } = await this.getActiveKeyPair();
      
      return jwt.sign(payload, privateKey, { 
        algorithm: 'RS256',
        keyid: keyId 
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Verify JWT using public key
   * @param {string} token - JWT token
   * @param {string} publicKey - Public key to verify with
   * @returns {Object|null} Decoded payload or null if invalid
   */
  static verifyToken(token, publicKey) {
    try {
      return jwt.verify(token, publicKey, { algorithms: ['RS256'] });
    } catch (error) {
      console.error('JWT verification failed:', error.message);
      return null;
    }
  }

  /**
   * Get JWKS (JSON Web Key Set) for public key distribution
   * @returns {Promise<Object>} JWKS object
   */
  static async getJWKS() {
    try {
      const keys = await query('SELECT key_id, public_key FROM keys WHERE active = 1');
      
      const jwks = {
        keys: keys.map(key => {
          // Convert PEM to JWK format
          const forge_key = forge.pki.publicKeyFromPem(key.public_key);
          const n = forge.util.encode64(forge_key.n.toString(16));
          const e = forge.util.encode64(forge_key.e.toString(16));
          
          return {
            kty: 'RSA',
            kid: key.key_id,
            use: 'sig',
            alg: 'RS256',
            n,
            e
          };
        })
      };
      
      return jwks;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = CryptoService;