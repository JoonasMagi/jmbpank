const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');

// Register new user
router.post('/register', userController.register);

// Login
router.post('/login', userController.login);

// Get all users
router.get('/', userController.getAllUsers);

// Get user profile (requires authentication)
router.get('/profile', authenticate, userController.getProfile);

module.exports = router;
