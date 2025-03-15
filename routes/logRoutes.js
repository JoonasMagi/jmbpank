const express = require('express');
const router = express.Router();
const logController = require('../controllers/logController');
const { authenticate } = require('../middleware/auth');

// Get latest logs
router.get('/', authenticate, logController.getLogs);

// Get specific log file
router.get('/:filename', authenticate, logController.getLogFile);

module.exports = router;