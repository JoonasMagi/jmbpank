const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { db } = require('../models/db');

// Only enable these routes in development mode
if (process.env.NODE_ENV !== 'production') {
  // Reset database (dangerous - for testing only)
  router.post('/reset-db', async (req, res) => {
    try {
      console.warn('Resetting database - THIS IS A DEVELOPMENT-ONLY FEATURE');

      // Delete all data from tables
      await new Promise((resolve, reject) => {
        db.serialize(() => {
          db.run('DELETE FROM transactions', err => {
            if (err) console.error('Error clearing transactions:', err);
          });

          db.run('DELETE FROM accounts', err => {
            if (err) console.error('Error clearing accounts:', err);
          });

          db.run('DELETE FROM users', err => {
            if (err) console.error('Error clearing users:', err);
          });

          // Reset autoincrement counters
          db.run('DELETE FROM sqlite_sequence', err => {
            if (err) {
              console.error('Error resetting counters:', err);
              reject(err);
            } else {
              resolve();
            }
          });
        });
      });

      console.log('Database reset successfully');
      res.json({ success: true, message: 'Database reset successfully' });
    } catch (error) {
      console.error('Error resetting database:', error);
      res.status(500).json({ success: false, error: 'Failed to reset database' });
    }
  });

  // Test endpoint to check if username exists
  router.get('/check-username/:username', async (req, res) => {
    try {
      const username = req.params.username;

      // Direct database query to check if username exists
      db.get('SELECT username FROM users WHERE username = ?', [username], (err, row) => {
        if (err) {
          console.error('Error checking username:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        res.json({
          username,
          exists: row ? true : false,
        });
      });
    } catch (error) {
      console.error('Error in check-username endpoint:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Debug database tables
  router.get('/tables', async (req, res) => {
    try {
      // Get list of tables
      db.all("SELECT name FROM sqlite_master WHERE type='table'", (err, tables) => {
        if (err) {
          console.error('Error getting tables:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        res.json({
          tables: tables.map(table => table.name),
        });
      });
    } catch (error) {
      console.error('Error getting database tables:', error);
      res.status(500).json({ error: 'Server error' });
    }
  });

  // Test endpoint to manually update bank prefix
  router.post('/update-bank-prefix', async (req, res) => {
    try {
      const { oldPrefix, newPrefix } = req.body;

      if (!oldPrefix || !newPrefix) {
        return res.status(400).json({
          error: 'Missing required fields',
          message: 'Both oldPrefix and newPrefix are required',
        });
      }

      if (oldPrefix.length !== 3 || newPrefix.length !== 3) {
        return res.status(400).json({
          error: 'Invalid prefix length',
          message: 'Bank prefixes must be exactly 3 characters long',
        });
      }

      console.log(`Manual bank prefix update requested: ${oldPrefix} -> ${newPrefix}`);

      // Import the Account model
      const Account = require('../models/account');

      // Update account numbers
      const updatedCount = await Account.updateBankPrefix(oldPrefix, newPrefix);

      // Update the prefix file with the new prefix
      const prefixFilePath = path.join(__dirname, '..', 'data', 'last_bank_prefix.txt');
      fs.writeFileSync(prefixFilePath, newPrefix);

      console.log(`Bank prefix manually updated from ${oldPrefix} to ${newPrefix}`);
      console.log(`Updated ${updatedCount} account numbers`);

      res.json({
        success: true,
        message: `Bank prefix updated from ${oldPrefix} to ${newPrefix}`,
        updatedAccounts: updatedCount,
      });
    } catch (error) {
      console.error('Error updating bank prefix:', error);
      res.status(500).json({
        error: 'Failed to update bank prefix',
        message: error.message,
      });
    }
  });
}

module.exports = router;
