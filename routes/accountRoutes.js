const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');
const { authenticate } = require('../middleware/auth');

// GET all accounts
router.get('/', accountController.getAllAccounts);

// GET accounts for authenticated user
router.get('/user', authenticate, accountController.getUserAccounts);

// GET account by account number
router.get('/:accountNumber', accountController.getAccount);

// POST create new account
router.post('/', authenticate, accountController.createAccount);

module.exports = router;