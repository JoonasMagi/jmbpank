const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Ensure database directory exists
const dbDir = path.join(__dirname, '../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Create a database connection
const dbPath = path.join(__dirname, '../data/bank.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Could not connect to database', err);
  } else {
    console.log('Connected to SQLite database');
    initDatabase();
  }
});

// Initialize database tables
function initDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Create users table
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        password_salt TEXT NOT NULL,
        full_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) console.error('Error creating users table:', err);
      });
      
      // Create accounts table
      db.run(`CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        account_number TEXT UNIQUE NOT NULL,
        owner_name TEXT NOT NULL,
        balance REAL DEFAULT 0,
        currency TEXT DEFAULT 'EUR',
        user_id INTEGER,
        account_type TEXT DEFAULT 'checking',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`, (err) => {
        if (err) console.error('Error creating accounts table:', err);
      });

      // Create transactions table
      db.run(`CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transaction_id TEXT UNIQUE NOT NULL,
        account_from TEXT NOT NULL,
        account_to TEXT NOT NULL,
        amount REAL NOT NULL,
        currency TEXT NOT NULL,
        explanation TEXT,
        status TEXT DEFAULT 'pending',
        sender_name TEXT,
        receiver_name TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )`, (err) => {
        if (err) console.error('Error creating transactions table:', err);
      });

      // Create keys table for storing RSA keys
      db.run(`CREATE TABLE IF NOT EXISTS keys (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        key_id TEXT UNIQUE NOT NULL,
        public_key TEXT NOT NULL,
        private_key TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        active BOOLEAN DEFAULT true
      )`, (err) => {
        if (err) {
          console.error('Error creating keys table:', err);
          reject(err);
        } else {
          console.log('Database tables created successfully');
          resolve();
        }
      });

      // Add an index for user_id on accounts table
      db.run(`CREATE INDEX IF NOT EXISTS idx_accounts_user_id ON accounts(user_id)`, (err) => {
        if (err) console.error('Error creating accounts index:', err);
      });

      // Add indexes for transaction searches
      db.run(`CREATE INDEX IF NOT EXISTS idx_transactions_account_from ON transactions(account_from)`, (err) => {
        if (err) console.error('Error creating transactions account_from index:', err);
      });

      db.run(`CREATE INDEX IF NOT EXISTS idx_transactions_account_to ON transactions(account_to)`, (err) => {
        if (err) console.error('Error creating transactions account_to index:', err);
      });
    });
  });
}

// Generic query function to handle promises
function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// Generic run function for inserts/updates
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ lastID: this.lastID, changes: this.changes });
      }
    });
  });
}

// Get a single row
function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

module.exports = {
  db,
  query,
  run,
  get,
  initDatabase
};