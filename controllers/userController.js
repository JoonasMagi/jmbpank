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
    console.log('Registration request received:', req.body);
    
    const { username, password, fullName, email } = req.body;
    
    console.log(`Registration attempt for username: ${username}, email: ${email}`);
    
    // Validate input
    if (!username || !password || !fullName || !email) {
      console.warn(`Registration failed for ${username}: Missing required fields`);
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    // Validate password complexity
    if (password.length < 8) {
      console.warn(`Registration failed for ${username}: Password too short`);
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    
    // Create user
    console.log('Creating user in database...');
    try {
      const user = await User.create(username, password, fullName, email);
      console.log(`User registered successfully: ${username} (ID: ${user.id})`);
      
      return res.status(201).json(user);
    } catch (dbError) {
      console.error('Database error during user creation:', dbError);
      if (dbError.message === 'Username already exists') {
        console.warn(`Registration failed: Username already exists - ${username}`);
        return res.status(400).json({ error: dbError.message });
      }
      throw dbError;
    }
  } catch (error) {
    console.error('Error in register controller:', error);
    return res.status(500).json({ error: 'Failed to register user', details: error.message });
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
      console.warn(`Login failed: Missing credentials for ${username || 'unknown user'}`);
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    // Validate credentials
    const user = await User.validateCredentials(username, password);
    
    if (!user) {
      console.warn(`Login failed: Invalid credentials for ${username}`);
      return res.status(401).json({ error: 'Invalid credentials' });
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
    console.error(`Error during login for user ${req.body.username}:`, error);
    res.status(500).json({ error: 'Failed to login' });
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
    console.error('Error getting users:', error);
    res.status(500).json({ error: 'Failed to retrieve users' });
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
      console.warn(`Profile request rejected: No authentication`);
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const user = await User.getByUsername(req.user.username);
    
    if (!user) {
      console.warn(`Profile not found for authenticated user: ${req.user.username}`);
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log(`Profile retrieved for user: ${user.username}`);
    res.json(User.excludePassword(user));
  } catch (error) {
    console.error(`Error getting profile for user ${req.user?.username}:`, error);
    res.status(500).json({ error: 'Failed to retrieve profile' });
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
      console.warn(`Logout rejected: No authentication`);
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Add token to blacklist (in-memory for simplicity)
    const token = req.headers.authorization.split(' ')[1];
    global.tokenBlacklist = global.tokenBlacklist || new Set();
    global.tokenBlacklist.add(token);
    
    console.log(`User ${req.user.username} logged out, token blacklisted`);
    res.status(200).json({ message: 'Logout successful' });
  } catch (error) {
    console.error(`Error logging out user ${req.user?.username}:`, error);
    res.status(500).json({ error: 'Failed to logout' });
  }
};