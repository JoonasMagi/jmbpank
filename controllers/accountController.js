const Account = require('../models/account');

/**
 * @swagger
 * components:
 *   schemas:
 *     Account:
 *       type: object
 *       required:
 *         - account_number
 *         - owner_name
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated id of the account
 *         account_number:
 *           type: string
 *           description: The account number with bank prefix
 *         owner_name:
 *           type: string
 *           description: The account owner's name
 *         balance:
 *           type: number
 *           description: The account balance
 *         currency:
 *           type: string
 *           description: The account currency
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: The creation timestamp
 */

/**
 * Get all accounts
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
/**
 * @swagger
 * /accounts:
 *   get:
 *     summary: Get all accounts
 *     tags: [Accounts]
 *     responses:
 *       200:
 *         description: List of all accounts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Account'
 *       500:
 *         description: Server error
 */
exports.getAllAccounts = async (req, res) => {
  try {
    const accounts = await Account.getAll();
    res.json(accounts);
  } catch (error) {
    console.error('Error getting accounts:', error);
    res.status(500).json({ error: 'Failed to retrieve accounts' });
  }
};

/**
 * Get accounts for authenticated user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
/**
 * @swagger
 * /accounts/user:
 *   get:
 *     summary: Get all accounts for the authenticated user
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of user's accounts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Account'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
exports.getUserAccounts = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const accounts = await Account.getByUserId(req.user.id);
    res.json(accounts);
  } catch (error) {
    console.error('Error getting user accounts:', error);
    res.status(500).json({ error: 'Failed to retrieve user accounts' });
  }
};

/**
 * Get account by account number
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
/**
 * @swagger
 * /accounts/{accountNumber}:
 *   get:
 *     summary: Get account by account number
 *     tags: [Accounts]
 *     parameters:
 *       - in: path
 *         name: accountNumber
 *         schema:
 *           type: string
 *         required: true
 *         description: The account number
 *     responses:
 *       200:
 *         description: Account details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Account'
 *       404:
 *         description: Account not found
 *       500:
 *         description: Server error
 */
exports.getAccount = async (req, res) => {
  try {
    const account = await Account.getByAccountNumber(req.params.accountNumber);

    if (!account) {
      return res.status(404).json({ error: 'Account not found' });
    }

    res.json(account);
  } catch (error) {
    console.error('Error getting account:', error);
    res.status(500).json({ error: 'Failed to retrieve account' });
  }
};

/**
 * Create a new account
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
/**
 * @swagger
 * /accounts:
 *   post:
 *     summary: Create a new account
 *     tags: [Accounts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               accountType:
 *                 type: string
 *                 enum: [checking, savings]
 *                 default: checking
 *                 description: Type of account
 *               currency:
 *                 type: string
 *                 default: EUR
 *                 description: Account currency
 *     responses:
 *       201:
 *         description: Account created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Account'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
exports.createAccount = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { accountType = 'checking', currency = 'EUR' } = req.body;

    // Validate account type
    if (!['checking', 'savings'].includes(accountType)) {
      return res.status(400).json({ error: 'Invalid account type' });
    }

    // Validate currency
    if (!['EUR', 'USD'].includes(currency)) {
      return res.status(400).json({ error: 'Invalid currency' });
    }

    const account = await Account.create({
      userId: req.user.id,
      ownerName: req.user.username,
      accountType,
      currency,
      initialBalance: 1000, // Give new users some money to work with
    });

    res.status(201).json(account);
  } catch (error) {
    console.error('Error creating account:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
};
