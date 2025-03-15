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
      return res.status(401).json({ 
        error: 'No token provided',
        code: 'AUTH_006',
        status: 401,
        timestamp: new Date().toISOString(),
        description: 'You must provide a valid authentication token',
        details: { route: req.originalUrl }
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Check if token is blacklisted
    if (global.tokenBlacklist && global.tokenBlacklist.has(token)) {
      console.warn(`Authentication failed: Token is blacklisted for ${req.method} ${req.url}`);
      return res.status(401).json({ 
        error: 'Token is blacklisted',
        code: 'AUTH_007',
        status: 401,
        timestamp: new Date().toISOString(),
        description: 'This token has been revoked. Please log in again',
        details: { route: req.originalUrl }
      });
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    console.log(`Token verification successful for user ${decoded.username}`);
    
    // Check if session exists
    if (!global.sessions || !global.sessions[token]) {
      console.warn(`Authentication failed: Invalid session for user ${decoded.username}`);
      return res.status(401).json({ 
        error: 'Invalid session',
        code: 'AUTH_008',
        status: 401,
        timestamp: new Date().toISOString(),
        description: 'Your session has expired. Please log in again',
        details: { username: decoded.username, route: req.originalUrl }
      });
    }
    
    // Get user
    const user = await User.getByUsername(decoded.username);
    
    if (!user) {
      console.warn(`Authentication failed: Invalid token - user ${decoded.username} not found`);
      return res.status(401).json({ 
        error: 'Invalid token',
        code: 'AUTH_009',
        status: 401,
        timestamp: new Date().toISOString(),
        description: 'The user associated with this token no longer exists',
        details: { username: decoded.username, route: req.originalUrl }
      });
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
      return res.status(401).json({ 
        error: 'Invalid token',
        code: 'AUTH_010',
        status: 401,
        timestamp: new Date().toISOString(),
        description: 'The authentication token is malformed or invalid',
        details: { message: error.message, route: req.originalUrl }
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      console.warn(`Authentication failed: Token expired`);
      return res.status(401).json({ 
        error: 'Token expired',
        code: 'AUTH_011',
        status: 401,
        timestamp: new Date().toISOString(),
        description: 'Your authentication token has expired. Please log in again',
        details: { route: req.originalUrl }
      });
    }
    
    console.error(`Auth middleware error [SERVER_AUTH_001] Status: 500 - ${error.message}`, {
      stack: error.stack,
      route: req.originalUrl
    });
    
    res.status(500).json({ 
      error: 'Authentication failed',
      code: 'SERVER_AUTH_001',
      status: 500,
      timestamp: new Date().toISOString(),
      description: 'An unexpected error occurred during authentication',
      details: { message: error.message, route: req.originalUrl }
    });
  }
};

/**
 * Admin authorization middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Next middleware function
 */
exports.isAdmin = (req, res, next) => {
  // Ensure user is authenticated first
  if (!req.user) {
    console.warn(`Admin check failed: No authenticated user for ${req.method} ${req.url}`);
    return res.status(401).json({ 
      error: 'Authentication required',
      code: 'AUTH_012',
      status: 401,
      timestamp: new Date().toISOString(),
      description: 'You must be logged in to access this resource',
      details: { route: req.originalUrl }
    });
  }
  
  // TODO: In a real application, check if user has admin role
  // For development purposes, we'll treat all authenticated users as admins
  if (process.env.NODE_ENV === 'development') {
    console.log(`Admin access granted to ${req.user.username} in development mode`);
    return next();
  }
  
  // Implement your admin check logic here
  // For example:
  const adminUsers = ['admin', 'joonas']; // List of admin usernames
  if (adminUsers.includes(req.user.username)) {
    console.log(`Admin access granted to ${req.user.username}`);
    return next();
  }
  
  console.warn(`Admin access denied for user ${req.user.username}`);
  res.status(403).json({ 
    error: 'Admin access required',
    code: 'AUTH_013',
    status: 403,
    timestamp: new Date().toISOString(),
    description: 'You do not have permission to access this resource',
    details: { username: req.user.username, route: req.originalUrl }
  });
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