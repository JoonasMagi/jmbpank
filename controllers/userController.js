const User = require('../models/user');
const jwt = require('jsonwebtoken');

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - username
 *         - full_name
 *         - email
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated id
 *         username:
 *           type: string
 *           description: User's username
 *         full_name:
 *           type: string
 *           description: User's full name
 *         email:
 *           type: string
 *           description: User's email
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 */

/**
 * Register a new user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
/**
 * @swagger
 * /users/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *               - fullName
 *               - email
 *             properties:
 *               username:
 *                 type: string
 *                 description: Username
 *               password:
 *                 type: string
 *                 description: Password
 *               fullName:
 *                 type: string
 *                 description: User's full name
 *               email:
 *                 type: string
 *                 description: User's email
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         description: Invalid input or username already exists
 *       500:
 *         description: Server error
 */
exports.register = async (req, res) => {
  try {
    console.log(`Registration request received: ${JSON.stringify(req.body, null, 2)}`);
    
    const { username, password, fullName, email } = req.body;
    
    console.log(`Registration attempt for username: ${username}, email: ${email}`);
    
    // Validate input
    if (!username || !password || !fullName || !email) {
      const errorResponse = {
        error: 'All fields are required',
        code: 'VALIDATION_001',
        status: 400,
        timestamp: new Date().toISOString(),
        details: {
          missingFields: Object.entries({
            username, password, fullName, email
          }).filter(([_, value]) => !value).map(([key]) => key)
        }
      };
      
      console.warn(`Registration failed [${errorResponse.code}] Status: ${errorResponse.status} - Missing required fields: ${JSON.stringify(errorResponse.details.missingFields)}`);
      return res.status(400).json(errorResponse);
    }
    
    // Validate password complexity
    if (password.length < 8) {
      const errorResponse = {
        error: 'Password must be at least 8 characters',
        code: 'VALIDATION_002',
        status: 400,
        timestamp: new Date().toISOString(),
        details: {
          field: 'password',
          reason: 'too_short',
          minLength: 8,
          actualLength: password.length
        }
      };
      
      console.warn(`Registration failed [${errorResponse.code}] Status: ${errorResponse.status} - Password too short - length: ${password.length}, required: 8`);
      return res.status(400).json(errorResponse);
    }
    
    try {
      // Create user
      console.log('Creating user in database...');
      const user = await User.create(username, password, fullName, email);
      console.log(`User registered successfully: ${username} (ID: ${user.id})`);
      
      return res.status(201).json(user);
    } catch (dbError) {
      // Convert error details to a safe loggable JSON string
      const errorDetails = {
        message: dbError.message,
        code: dbError.code,
        status: dbError.status || 400,
        details: dbError.details || {},
        originalError: dbError.originalError ? String(dbError.originalError) : null
      };
      
      console.error(`Database error during user creation: ${JSON.stringify(errorDetails, null, 2)}`);
      
      // Use the error status from the model or default to 400
      const status = dbError.status || 400;
      
      const errorResponse = {
        error: dbError.message,
        code: dbError.code || 'UNKNOWN',
        status,
        timestamp: new Date().toISOString(),
        details: dbError.details || {}
      };
      
      // Log specific error types with their codes
      if (dbError.code === User.ErrorCodes.USERNAME_EXISTS) {
        console.warn(`Registration failed [${dbError.code}] Status: ${status} - Username already exists: ${username}`);
      } else if (dbError.code === User.ErrorCodes.EMAIL_EXISTS) {
        console.warn(`Registration failed [${dbError.code}] Status: ${status} - Email already exists: ${email}`);
      } else if (dbError.code === User.ErrorCodes.CONSTRAINT_VIOLATION) {
        console.warn(`Registration failed [${dbError.code}] Status: ${status} - Constraint violation: ${JSON.stringify(dbError.details)}`);
      } else if (dbError.code === User.ErrorCodes.DATABASE_ERROR) {
        console.error(`Registration failed [${dbError.code}] Status: ${status} - Database error: ${dbError.message}`);
      } else {
        console.error(`Registration failed [${dbError.code || 'UNKNOWN'}] Status: ${status} - ${dbError.message}`);
      }
      
      return res.status(status).json(errorResponse);
    }
  } catch (error) {
    // For unexpected errors not caught by the specific handlers
    const errorResponse = {
      error: 'Failed to register user',
      code: 'SERVER_001',
      status: 500,
      timestamp: new Date().toISOString(),
      details: { message: error.message }
    };
    
    console.error(`Unexpected error in register controller [${errorResponse.code}] Status: ${errorResponse.status} - ${error.message}`, {
      stack: error.stack,
    });
    
    return res.status(500).json(errorResponse);
  }
};

/**
 * Login user and create session
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
/**
 * @swagger
 * /sessions:
 *   post:
 *     summary: Login user and create session
 *     tags: [Sessions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 description: Username
 *               password:
 *                 type: string
 *                 description: Password
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *                 token:
 *                   type: string
 *                   description: JWT token
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Server error
 */
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log(`Login attempt for username: ${username}`);
    
    // Validate input
    if (!username || !password) {
      const errorResponse = {
        error: 'Username and password are required',
        code: 'AUTH_001',
        status: 400,
        timestamp: new Date().toISOString(),
        details: {
          missingFields: Object.entries({
            username, password
          }).filter(([_, value]) => !value).map(([key]) => key)
        }
      };
      
      console.warn(`Login failed [${errorResponse.code}] Status: ${errorResponse.status} - Missing credentials: ${JSON.stringify(errorResponse.details.missingFields)}`);
      return res.status(400).json(errorResponse);
    }
    
    // Validate credentials
    const user = await User.validateCredentials(username, password);
    
    if (!user) {
      const errorResponse = {
        error: 'Invalid credentials',
        code: 'AUTH_002',
        status: 401,
        timestamp: new Date().toISOString()
      };
      
      console.warn(`Login failed [${errorResponse.code}] Status: ${errorResponse.status} - Invalid credentials for ${username}`);
      return res.status(401).json(errorResponse);
    }
    
    // Generate JWT
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );
    
    // Create session
    global.sessions = global.sessions || {};
    global.sessions[token] = { userId: user.id, username: user.username };
    
    console.log(`User ${username} (ID: ${user.id}) logged in successfully, token issued`);
    
    res.json({ user, token });
  } catch (error) {
    // For database errors from the model
    if (error.code && error.code === User.ErrorCodes.DATABASE_ERROR) {
      const errorResponse = {
        error: 'Authentication error',
        code: error.code,
        status: error.status || 500,
        timestamp: new Date().toISOString(),
        details: error.details || {}
      };
      
      console.error(`Login failed [${error.code}] Status: ${errorResponse.status} - Database error during login for ${req.body.username} - ${error.message}`);
      return res.status(errorResponse.status).json(errorResponse);
    }
    
    // For unexpected errors
    const errorResponse = {
      error: 'Failed to login',
      code: 'SERVER_002',
      status: 500,
      timestamp: new Date().toISOString()
    };
    
    console.error(`Login failed [${errorResponse.code}] Status: ${errorResponse.status} - Unexpected error for user ${req.body.username}: ${error.message}`, {
      stack: error.stack
    });
    
    res.status(500).json(errorResponse);
  }
};

/**
 * Get all users
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 *       500:
 *         description: Server error
 */
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.getAll();
    console.log(`Retrieved ${users.length} users`);
    res.json(users);
  } catch (error) {
    const errorResponse = {
      error: 'Failed to retrieve users',
      code: error.code || 'SERVER_003',
      status: error.status || 500,
      timestamp: new Date().toISOString()
    };
    
    console.error(`Error getting users [${errorResponse.code}] Status: ${errorResponse.status} - ${error.message}`, {
      details: error.details ? JSON.stringify(error.details) : null,
      stack: error.stack
    });
    
    res.status(errorResponse.status).json(errorResponse);
  }
};

/**
 * Get user profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
/**
 * @swagger
 * /users/profile:
 *   get:
 *     summary: Get current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
exports.getProfile = async (req, res) => {
  try {
    // Note: This assumes authentication middleware has set req.user
    if (!req.user) {
      const errorResponse = {
        error: 'Unauthorized',
        code: 'AUTH_003',
        status: 401,
        timestamp: new Date().toISOString()
      };
      
      console.warn(`Profile request rejected [${errorResponse.code}] Status: ${errorResponse.status} - No authentication`);
      return res.status(401).json(errorResponse);
    }
    
    const user = await User.getByUsername(req.user.username);
    
    if (!user) {
      const errorResponse = {
        error: 'User not found',
        code: 'USER_NOT_FOUND',
        status: 404,
        timestamp: new Date().toISOString(),
        details: { username: req.user.username }
      };
      
      console.warn(`Profile not found [${errorResponse.code}] Status: ${errorResponse.status} - User not found: ${req.user.username}`);
      return res.status(404).json(errorResponse);
    }
    
    console.log(`Profile retrieved for user: ${user.username}`);
    res.json(User.excludePassword(user));
  } catch (error) {
    const errorResponse = {
      error: 'Failed to retrieve profile',
      code: error.code || 'SERVER_004',
      status: error.status || 500,
      timestamp: new Date().toISOString()
    };
    
    console.error(`Error getting profile [${errorResponse.code}] Status: ${errorResponse.status} - ${error.message} - User: ${req.user?.username}`, {
      details: error.details ? JSON.stringify(error.details) : null,
      stack: error.stack
    });
    
    res.status(errorResponse.status).json(errorResponse);
  }
};

/**
 * Logout user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
/**
 * @swagger
 * /sessions:
 *   delete:
 *     summary: Logout user
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
exports.logout = async (req, res) => {
  try {
    // Note: This assumes authentication middleware has set req.user
    if (!req.user) {
      const errorResponse = {
        error: 'Unauthorized',
        code: 'AUTH_004',
        status: 401,
        timestamp: new Date().toISOString()
      };
      
      console.warn(`Logout rejected [${errorResponse.code}] Status: ${errorResponse.status} - No authentication`);
      return res.status(401).json(errorResponse);
    }
    
    // Add token to blacklist (in-memory for simplicity)
    const token = req.headers.authorization.split(' ')[1];
    global.tokenBlacklist = global.tokenBlacklist || new Set();
    global.tokenBlacklist.add(token);
    
    console.log(`User ${req.user.username} logged out, token blacklisted`);
    res.status(200).json({ 
      message: 'Logout successful',
      code: 'AUTH_SUCCESS',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    const errorResponse = {
      error: 'Failed to logout',
      code: 'SERVER_005',
      status: 500,
      timestamp: new Date().toISOString()
    };
    
    console.error(`Error logging out user [${errorResponse.code}] Status: ${errorResponse.status} - ${error.message} - User: ${req.user?.username}`, {
      stack: error.stack
    });
    
    res.status(500).json(errorResponse);
  }
};