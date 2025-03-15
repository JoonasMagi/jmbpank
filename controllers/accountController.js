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
    
    // Ensure the account belongs to the authenticated user
    if (account.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
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
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - ownerName
 *             properties:
 *               ownerName:
 *                 type: string
 *                 description: The owner's name
 *               currency:
 *                 type: string
 *                 description: Account currency (default EUR)
 *               initialBalance:
 *                 type: number
 *                 description: Initial account balance (default 0)
 *     responses:
 *       201:
 *         description: Account created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Account'
 *       400:
 *         description: Invalid input
 *       500:
 *         description: Server error
 */
exports.createAccount = async (req, res) => {
  try {
    const { ownerName, currency = 'EUR', initialBalance = 0 } = req.body;
    
    if (!ownerName) {
      return res.status(400).json({ error: 'Owner name is required' });
    }
    
    const account = await Account.create(ownerName, currency, initialBalance);
    res.status(201).json(account);
  } catch (error) {
    console.error('Error creating account:', error);
    res.status(500).json({ error: 'Failed to create account' });
  }
};