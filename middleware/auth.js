const jwt = require('jsonwebtoken');
const User = require('../models/user');

/**
 * Authentication middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
exports.authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn(`Authentication failed: No token provided for ${req.method} ${req.url}`);
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Check if token is blacklisted
    if (global.tokenBlacklist && global.tokenBlacklist.has(token)) {
      console.warn(`Authentication failed: Token is blacklisted for ${req.method} ${req.url}`);
      return res.status(401).json({ error: 'Token is blacklisted' });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    console.log(`Token verification successful for user ${decoded.username}`);
    
    // Check if session exists
    if (!global.sessions || !global.sessions[token]) {
      console.warn(`Authentication failed: Invalid session for user ${decoded.username}`);
      return res.status(401).json({ error: 'Invalid session' });
    }
    
    // Get user
    const user = await User.getByUsername(decoded.username);
    
    if (!user) {
      console.warn(`Authentication failed: Invalid token - user ${decoded.username} not found`);
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    console.log(`User ${user.username} authenticated successfully for ${req.method} ${req.url}`);
    
    // Set user on request
    req.user = {
      id: user.id,
      username: user.username
    };
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      console.warn(`Authentication failed: Invalid token format - ${error.message}`);
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    if (error.name === 'TokenExpiredError') {
      console.warn(`Authentication failed: Token expired`);
      return res.status(401).json({ error: 'Token expired' });
    }
    
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

/**
 * Optional authentication middleware
 * This middleware does not require authentication but enhances the request with user data if a token is provided
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
exports.optionalAuth = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token, but that's fine - continue without user data
      console.debug(`Optional auth: No token provided for ${req.method} ${req.url}`);
      return next();
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    
    // Get user
    const user = await User.getByUsername(decoded.username);
    
    if (user) {
      // Set user on request
      req.user = {
        id: user.id,
        username: user.username
      };
      console.log(`Optional auth: User ${user.username} identified for ${req.method} ${req.url}`);
    } else {
      console.warn(`Optional auth: Token contains username ${decoded.username} but user not found`);
    }
    
    next();
  } catch (error) {
    // Any errors in token verification just mean we proceed without user data
    console.debug(`Optional auth: Token verification failed - ${error.message}`);
    next();
  }
};