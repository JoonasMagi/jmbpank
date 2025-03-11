const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');

// GET all accounts
router.get('/', accountController.getAllAccounts);

// GET account by account number
router.get('/:accountNumber', accountController.getAccount);

// POST create new account
router.post('/', accountController.createAccount);

module.exports = router;