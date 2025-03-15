const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');

// Login (create session)
router.post('/', userController.login);

// Logout (delete session)
router.delete('/', authenticate, userController.logout);

module.exports = router;