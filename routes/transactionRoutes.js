const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');

// GET transactions for account
router.get('/account/:accountNumber', transactionController.getAccountTransactions);

// POST create new transaction
router.post('/', transactionController.createTransaction);

// POST process bank-to-bank transaction
router.post('/b2b', transactionController.processB2BTransaction);

// GET JWKS (JSON Web Key Set)
router.get('/jwks', transactionController.getJWKS);

module.exports = router;