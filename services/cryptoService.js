const forge = require('node-forge');
const jwt = require('jsonwebtoken');

// In-memory key storage
const inMemoryKeys = {
  activeKeyPair: null,
};

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
      privateKey,
    };
  }

  /**
   * Create a new RSA key pair and store it in memory
   * @param {string} keyId - The key identifier
   * @param {boolean} forceNew - Whether to force creation of a new key
   * @returns {Promise<Object>} Created key pair
   */
  static async createAndStoreKeyPair(keyId = '1', forceNew = false) {
    try {
      // If forceNew is false and we already have a key in memory, return it
      if (!forceNew && inMemoryKeys.activeKeyPair) {
        console.log(`Using existing in-memory key with ID ${inMemoryKeys.activeKeyPair.keyId}`);
        return inMemoryKeys.activeKeyPair;
      }

      // Generate new key pair
      console.log(`Generating new RSA key pair with ID ${keyId}`);
      const { publicKey, privateKey } = this.generateKeyPair();

      // Store in memory
      inMemoryKeys.activeKeyPair = { keyId, publicKey, privateKey };

      console.log('RSA key pair generated and stored in memory successfully');
      return inMemoryKeys.activeKeyPair;
    } catch (error) {
      console.error('Error in createAndStoreKeyPair:', error);
      // Even if we fail, return a temporary key pair for this session
      const { publicKey, privateKey } = this.generateKeyPair();
      const tempKeyPair = { keyId, publicKey, privateKey, temporary: true };

      // Still store it in memory so we can use it later
      if (!inMemoryKeys.activeKeyPair) {
        inMemoryKeys.activeKeyPair = tempKeyPair;
      }

      console.log('Created temporary in-memory key');
      return tempKeyPair;
    }
  }

  /**
   * Get active key pair from memory
   * @returns {Promise<Object>} Active key pair
   */
  static async getActiveKeyPair() {
    try {
      // If we already have a key in memory, return it
      if (inMemoryKeys.activeKeyPair) {
        return inMemoryKeys.activeKeyPair;
      }

      // Create a new key pair if none exists
      return await this.createAndStoreKeyPair('1');
    } catch (error) {
      console.error('Error in getActiveKeyPair:', error);
      // Even if we fail, return a temporary key pair for this session
      const { publicKey, privateKey } = this.generateKeyPair();
      const tempKeyPair = { keyId: '1', publicKey, privateKey, temporary: true };

      // Store it in memory for future use
      if (!inMemoryKeys.activeKeyPair) {
        inMemoryKeys.activeKeyPair = tempKeyPair;
      }

      return tempKeyPair;
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
        keyid: keyId,
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
    return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
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
      // Get the active key pair from memory
      const keyPair = await this.getActiveKeyPair();

      if (!keyPair) {
        throw new Error('No active key pair found');
      }

      try {
        // Convert PEM to JWK format
        const forge_key = forge.pki.publicKeyFromPem(keyPair.publicKey);

        // Get modulus and exponent as raw bytes
        const nBuffer = Buffer.from(forge_key.n.toString(16), 'hex');
        const eBuffer = Buffer.from(forge_key.e.toString(16), 'hex');

        // Convert to base64url encoding
        const n = this.base64UrlEncode(nBuffer);
        const e = this.base64UrlEncode(eBuffer);

        return {
          keys: [
            {
              kty: 'RSA',
              kid: keyPair.keyId,
              use: 'sig',
              alg: 'RS256',
              n,
              e,
            },
          ],
        };
      } catch (error) {
        console.error('Error converting key to JWK:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error getting JWKS:', error);

      // As a last resort, generate a new key pair and return its JWKS
      try {
        const { keyId, publicKey } = this.generateKeyPair();
        const forge_key = forge.pki.publicKeyFromPem(publicKey);

        // Get modulus and exponent as raw bytes
        const nBuffer = Buffer.from(forge_key.n.toString(16), 'hex');
        const eBuffer = Buffer.from(forge_key.e.toString(16), 'hex');

        // Convert to base64url encoding
        const n = this.base64UrlEncode(nBuffer);
        const e = this.base64UrlEncode(eBuffer);

        return {
          keys: [
            {
              kty: 'RSA',
              kid: '1', // Default key ID
              use: 'sig',
              alg: 'RS256',
              n,
              e,
            },
          ],
        };
      } catch (innerError) {
        console.error('Error creating fallback JWKS:', innerError);
        throw new Error('Failed to generate JWKS');
      }
    }
  }
}

module.exports = CryptoService;
