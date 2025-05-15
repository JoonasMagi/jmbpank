const Transaction = require('../models/transaction');
const TransactionService = require('../services/transactionService');
const CryptoService = require('../services/cryptoService');

/**
 * @swagger
 * components:
 *   schemas:
 *     Transaction:
 *       type: object
 *       required:
 *         - transaction_id
 *         - account_from
 *         - account_to
 *         - amount
 *         - currency
 *       properties:
 *         id:
 *           type: integer
 *           description: The auto-generated id
 *         transaction_id:
 *           type: string
 *           description: Unique transaction identifier
 *         account_from:
 *           type: string
 *           description: Sender account number
 *         account_to:
 *           type: string
 *           description: Receiver account number
 *         amount:
 *           type: number
 *           description: Transaction amount
 *         currency:
 *           type: string
 *           description: Transaction currency
 *         explanation:
 *           type: string
 *           description: Transaction explanation
 *         status:
 *           type: string
 *           description: Transaction status
 *         sender_name:
 *           type: string
 *           description: Sender's name
 *         receiver_name:
 *           type: string
 *           description: Receiver's name
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Transaction creation time
 */

/**
 * Get all transactions for an account
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
/**
 * @swagger
 * /transactions/account/{accountNumber}:
 *   get:
 *     summary: Get all transactions for an account
 *     tags: [Transactions]
 *     parameters:
 *       - in: path
 *         name: accountNumber
 *         schema:
 *           type: string
 *         required: true
 *         description: The account number
 *     responses:
 *       200:
 *         description: List of transactions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Transaction'
 *       404:
 *         description: Account not found
 *       500:
 *         description: Server error
 */
exports.getAccountTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.getByAccount(req.params.accountNumber);
    res.json(transactions);
  } catch (error) {
    console.error('Error getting transactions:', error);
    res.status(500).json({ error: 'Failed to retrieve transactions' });
  }
};

/**
 * Create a new transaction
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
/**
 * @swagger
 * /transactions:
 *   post:
 *     summary: Create a new transaction
 *     tags: [Transactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - accountFrom
 *               - accountTo
 *               - amount
 *             properties:
 *               accountFrom:
 *                 type: string
 *                 description: Sender account number
 *               accountTo:
 *                 type: string
 *                 description: Receiver account number
 *               amount:
 *                 type: number
 *                 description: Transaction amount
 *               currency:
 *                 type: string
 *                 default: EUR
 *                 description: Transaction currency
 *               explanation:
 *                 type: string
 *                 description: Transaction purpose
 *               senderName:
 *                 type: string
 *                 description: Sender name (optional)
 *     responses:
 *       201:
 *         description: Transaction created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Transaction'
 *       400:
 *         description: Invalid input
 *       404:
 *         description: Account not found
 *       402:
 *         description: Insufficient funds
 *       500:
 *         description: Server error
 */
exports.createTransaction = async (req, res) => {
  try {
    const { accountFrom, accountTo, amount, currency, explanation, senderName } = req.body;

    if (!accountFrom || !accountTo || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (amount <= 0) {
      return res.status(400).json({ error: 'Amount must be positive' });
    }

    const result = await TransactionService.processOutgoingB2BTransaction({
      accountFrom,
      accountTo,
      amount,
      currency,
      explanation,
      senderName,
    });

    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating transaction:', error);

    if (
      error.message === 'Sender account not found' ||
      error.message === 'Receiver account not found'
    ) {
      return res.status(404).json({ error: error.message });
    }

    if (error.message === 'Insufficient funds') {
      return res.status(402).json({ error: error.message });
    }

    res.status(500).json({ error: 'Failed to process transaction' });
  }
};

/**
 * Process bank-to-bank transaction
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
/**
 * @swagger
 * /transactions/b2b:
 *   post:
 *     summary: Process incoming bank-to-bank transaction
 *     tags: [Transactions]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - jwt
 *             properties:
 *               jwt:
 *                 type: string
 *                 description: JWT token containing transaction data
 *     responses:
 *       200:
 *         description: Transaction processed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 receiverName:
 *                   type: string
 *                   description: Receiver's name
 *       400:
 *         description: Invalid JWT
 *       404:
 *         description: Account not found
 *       500:
 *         description: Server error
 */
exports.processB2BTransaction = async (req, res) => {
  try {
    const { jwt } = req.body;

    if (!jwt) {
      return res.status(400).json({ error: 'JWT is required' });
    }

    const result = await TransactionService.processIncomingB2BTransaction(jwt);
    res.json(result);
  } catch (error) {
    console.error('Error processing B2B transaction:', error);

    if (error.message === 'Receiver account not found') {
      return res.status(404).json({ error: error.message });
    }

    if (error.message.includes('Invalid JWT')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Failed to process B2B transaction' });
  }
};

/**
 * Get JWKS for public key distribution
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
/**
 * @swagger
 * /transactions/jwks:
 *   get:
 *     summary: Get JSON Web Key Set
 *     tags: [Transactions]
 *     responses:
 *       200:
 *         description: JWKS containing public keys
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 keys:
 *                   type: array
 *                   items:
 *                     type: object
 *       500:
 *         description: Server error
 */
exports.getJWKS = async (req, res) => {
  try {
    const jwks = await CryptoService.getJWKS();
    res.json(jwks);
  } catch (error) {
    console.error('Error getting JWKS:', error);
    res.status(500).json({ error: 'Failed to get JWKS' });
  }
};
