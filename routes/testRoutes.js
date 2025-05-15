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
}

module.exports = router;
