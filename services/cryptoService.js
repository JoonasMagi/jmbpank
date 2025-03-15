const forge = require('node-forge');
const jwt = require('jsonwebtoken');
const { run, get, query, initDatabase } = require('../models/db');

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
      // Ensure the database is initialized
      await initDatabase().catch(err => {
        console.log('Initializing database before storing keys...');
      });
      
      try {
        // Check if key already exists
        const existingKey = await get('SELECT * FROM keys WHERE key_id = ?', [keyId]);
        
        if (existingKey) {
          console.log(`Key ${keyId} already exists, using existing key`);
          return {
            keyId,
            publicKey: existingKey.public_key,
            privateKey: existingKey.private_key
          };
        }
      } catch (err) {
        console.log('Error checking for existing key, will try to create a new one:', err.message);
      }
      
      // Generate new key pair
      console.log(`Generating new RSA key pair with ID ${keyId}`);
      const { publicKey, privateKey } = this.generateKeyPair();
      
      // Store in database
      await run(
        'INSERT INTO keys (key_id, public_key, private_key, active) VALUES (?, ?, ?, 1)',
        [keyId, publicKey, privateKey]
      );
      
      console.log('RSA key pair generated and stored successfully');
      return { keyId, publicKey, privateKey };
    } catch (error) {
      console.error('Error in createAndStoreKeyPair:', error);
      // Even if we fail, return a temporary key pair for this session
      const { publicKey, privateKey } = this.generateKeyPair();
      console.log('Created temporary in-memory key (not stored in DB)');
      return { keyId, publicKey, privateKey, temporary: true };
    }
  }

  /**
   * Get active key pair
   * @returns {Promise<Object>} Active key pair
   */
  static async getActiveKeyPair() {
    try {
      // Ensure the database is initialized
      await initDatabase().catch(err => {
        console.log('Initializing database before getting active key...');
      });
      
      try {
        const key = await get('SELECT * FROM keys WHERE active = 1 LIMIT 1');
        
        if (key) {
          return {
            keyId: key.key_id,
            publicKey: key.public_key,
            privateKey: key.private_key
          };
        }
      } catch (err) {
        console.log('Error getting active key, will create a new one:', err.message);
      }
      
      // Create default key pair if none exists
      return await this.createAndStoreKeyPair('1');
    } catch (error) {
      console.error('Error in getActiveKeyPair:', error);
      // Even if we fail, return a temporary key pair for this session
      const { publicKey, privateKey } = this.generateKeyPair();
      return { keyId: '1', publicKey, privateKey, temporary: true };
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
      console.error('Error signing payload:', error);
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
   * Base64Url encoding helper
   * @param {Buffer} buffer - Buffer to encode
   * @returns {string} Base64Url encoded string
   */
  static base64UrlEncode(buffer) {
    return buffer.toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  /**
   * Convert JWK to PEM format
   * @param {Object} jwk - JSON Web Key
   * @returns {string} PEM format public key
   */
  static jwkToPem(jwk) {
    try {
      // Convert the base64url-encoded values back to regular base64
      let nBase64 = jwk.n.replace(/-/g, '+').replace(/_/g, '/');
      let eBase64 = jwk.e.replace(/-/g, '+').replace(/_/g, '/');
      
      // Add padding if needed
      while (nBase64.length % 4 !== 0) {
        nBase64 += '=';
      }
      
      while (eBase64.length % 4 !== 0) {
        eBase64 += '=';
      }
      
      // Decode base64 values to binary
      const nBytes = Buffer.from(nBase64, 'base64');
      const eBytes = Buffer.from(eBase64, 'base64');
      
      // Convert bytes to BigIntegers
      const nBigInt = new forge.jsbn.BigInteger(nBytes.toString('hex'), 16);
      const eBigInt = new forge.jsbn.BigInteger(eBytes.toString('hex'), 16);
      
      // Create RSA public key with modulus (n) and exponent (e)
      const publicKey = forge.pki.rsa.setPublicKey(nBigInt, eBigInt);
      
      // Convert to PEM format
      return forge.pki.publicKeyToPem(publicKey);
    } catch (error) {
      console.error('Error converting JWK to PEM:', error);
      throw new Error('Failed to convert JWK to PEM');
    }
  }

  /**
   * Get JWKS (JSON Web Key Set) for public key distribution
   * @returns {Promise<Object>} JWKS object
   */
  static async getJWKS() {
    try {
      // Ensure database is initialized
      await initDatabase().catch(err => {
        console.log('Initializing database before getting JWKS...');
      });
      
      let keys;
      try {
        keys = await query('SELECT key_id, public_key FROM keys WHERE active = 1');
      } catch (err) {
        console.log('Error getting keys from database, creating temporary keys:', err.message);
        // If we can't get keys from database, create a temporary one
        const tmp = await this.getActiveKeyPair();
        keys = [{key_id: tmp.keyId, public_key: tmp.publicKey}];
      }
      
      const jwks = {
        keys: keys.map(key => {
          try {
            // Convert PEM to JWK format
            const forge_key = forge.pki.publicKeyFromPem(key.public_key);
            
            // Get modulus and exponent as raw bytes
            const nBuffer = Buffer.from(forge_key.n.toString(16), 'hex');
            const eBuffer = Buffer.from(forge_key.e.toString(16), 'hex');
            
            // Convert to base64url encoding
            const n = this.base64UrlEncode(nBuffer);
            const e = this.base64UrlEncode(eBuffer);
            
            return {
              kty: 'RSA',
              kid: key.key_id,
              use: 'sig',
              alg: 'RS256',
              n,
              e
            };
          } catch (error) {
            console.error('Error converting key to JWK:', error);
            return null;
          }
        }).filter(Boolean) // Remove null entries
      };
      
      return jwks;
    } catch (error) {
      console.error('Error getting JWKS:', error);
      // Return a minimal JWKS with a temporary key
      const { keyId, publicKey } = await this.getActiveKeyPair();
      try {
        const forge_key = forge.pki.publicKeyFromPem(publicKey);
        
        // Get modulus and exponent as raw bytes
        const nBuffer = Buffer.from(forge_key.n.toString(16), 'hex');
        const eBuffer = Buffer.from(forge_key.e.toString(16), 'hex');
        
        // Convert to base64url encoding
        const n = this.base64UrlEncode(nBuffer);
        const e = this.base64UrlEncode(eBuffer);
        
        return {
          keys: [{
            kty: 'RSA',
            kid: keyId,
            use: 'sig',
            alg: 'RS256',
            n,
            e
          }]
        };
      } catch (innerError) {
        console.error('Error creating fallback JWKS:', innerError);
        throw new Error('Failed to generate JWKS');
      }
    }
  }
}

module.exports = CryptoService;