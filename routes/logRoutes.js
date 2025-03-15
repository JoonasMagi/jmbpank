const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { authenticate, isAdmin } = require('../middleware/auth');

// Get logs directory
const logsDir = path.join(__dirname, '../logs');

// Ensure logs directory exists
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
  console.log('Created logs directory at:', logsDir);
}

// Get all logs
router.get('/', authenticate, (req, res) => {
  try {
    // Get most recent log file
    const today = new Date().toISOString().slice(0, 10);
    const logFile = path.join(logsDir, `app-${today}.log`);
    
    // If today's log file doesn't exist, create an empty one
    if (!fs.existsSync(logFile)) {
      // Try to find the most recent log file
      const logFiles = fs.readdirSync(logsDir)
        .filter(file => file.startsWith('app-') && file.endsWith('.log'))
        .sort()
        .reverse();
      
      if (logFiles.length === 0) {
        // No existing log files, create a new one
        const timestamp = new Date().toISOString();
        fs.writeFileSync(logFile, `[${timestamp}] INFO: Log file created\n`);
        console.log('Created new log file at:', logFile);
        return res.json([`[${timestamp}] INFO: Log file created`]);
      }
      
      // Use the most recent log file
      const logFilePath = path.join(logsDir, logFiles[0]);
      console.log('Using most recent log file:', logFilePath);
      const logContent = fs.readFileSync(logFilePath, 'utf8');
      const logLines = logContent.split('\n').filter(line => line.trim() !== '');
      return res.json(logLines);
    }
    
    // Read today's log file
    const logContent = fs.readFileSync(logFile, 'utf8');
    const logLines = logContent.split('\n').filter(line => line.trim() !== '');
    
    res.json(logLines);
  } catch (error) {
    console.error(`Error retrieving logs [SERVER_LOG_001] Status: 500 - ${error.message}`, {
      stack: error.stack
    });
    
    res.status(500).json({ 
      error: 'Failed to retrieve logs', 
      code: 'SERVER_LOG_001',
      status: 500,
      timestamp: new Date().toISOString(),
      description: 'Failed to retrieve application logs',
      details: { message: error.message }
    });
  }
});

// Get available log files
router.get('/files', authenticate, isAdmin, (req, res) => {
  try {
    // Get all log files
    const logFiles = fs.readdirSync(logsDir)
      .filter(file => file.endsWith('.log'))
      .map(file => ({
        name: file,
        path: path.join(logsDir, file),
        size: fs.statSync(path.join(logsDir, file)).size,
        date: fs.statSync(path.join(logsDir, file)).mtime
      }))
      .sort((a, b) => b.date - a.date); // Sort by date, newest first
    
    res.json(logFiles);
  } catch (error) {
    console.error(`Error retrieving log files [SERVER_LOG_002] Status: 500 - ${error.message}`, {
      stack: error.stack
    });
    
    res.status(500).json({ 
      error: 'Failed to retrieve log files', 
      code: 'SERVER_LOG_002',
      status: 500,
      timestamp: new Date().toISOString(),
      description: 'Failed to retrieve list of log files',
      details: { message: error.message }
    });
  }
});

// Get specific log file
router.get('/file/:filename', authenticate, isAdmin, (req, res) => {
  try {
    const filename = req.params.filename;
    
    // Validate filename to prevent directory traversal
    if (!filename.match(/^app-\d{4}-\d{2}-\d{2}\.log$/)) {
      return res.status(400).json({ 
        error: 'Invalid log filename', 
        code: 'VALIDATION_LOG_001',
        status: 400,
        timestamp: new Date().toISOString(),
        description: 'The specified log filename is invalid',
        details: { filename }
      });
    }
    
    const logFilePath = path.join(logsDir, filename);
    
    if (!fs.existsSync(logFilePath)) {
      return res.status(404).json({ 
        error: 'Log file not found', 
        code: 'LOG_NOT_FOUND',
        status: 404,
        timestamp: new Date().toISOString(),
        description: 'The requested log file was not found',
        details: { filename }
      });
    }
    
    // Read the log file
    const logContent = fs.readFileSync(logFilePath, 'utf8');
    const logLines = logContent.split('\n').filter(line => line.trim() !== '');
    
    res.json(logLines);
  } catch (error) {
    console.error(`Error retrieving log file [SERVER_LOG_003] Status: 500 - ${error.message}`, {
      stack: error.stack,
      filename: req.params.filename
    });
    
    res.status(500).json({ 
      error: 'Failed to retrieve log file', 
      code: 'SERVER_LOG_003',
      status: 500,
      timestamp: new Date().toISOString(),
      description: 'Failed to retrieve specific log file',
      details: { 
        filename: req.params.filename,
        message: error.message 
      }
    });
  }
});

// Clear logs (development only)
router.post('/clear', authenticate, (req, res) => {
  try {
    // Only allow in development mode
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ 
        error: 'Not allowed in production', 
        code: 'AUTH_LOG_001',
        status: 403,
        timestamp: new Date().toISOString(),
        description: 'Clearing logs is not allowed in production mode',
        details: { environment: process.env.NODE_ENV }
      });
    }
    
    // Get today's log file
    const today = new Date().toISOString().slice(0, 10);
    const logFile = path.join(logsDir, `app-${today}.log`);
    
    // Check if file exists
    if (fs.existsSync(logFile)) {
      // Clear the log file
      fs.writeFileSync(logFile, '');
      console.log(`Logs cleared by user ${req.user.username}`);
      
      // Add initial log entry
      const timestamp = new Date().toISOString();
      fs.appendFileSync(logFile, `[${timestamp}] INFO: Logs cleared by user ${req.user.username}\n`);
    } else {
      // Create a new log file
      const timestamp = new Date().toISOString();
      fs.writeFileSync(logFile, `[${timestamp}] INFO: Log file created\n`);
      console.log('Created new log file at:', logFile);
    }
    
    res.json({ 
      message: 'Logs cleared successfully',
      code: 'LOG_CLEARED',
      status: 200,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error(`Error clearing logs [SERVER_LOG_004] Status: 500 - ${error.message}`, {
      stack: error.stack
    });
    
    res.status(500).json({ 
      error: 'Failed to clear logs', 
      code: 'SERVER_LOG_004',
      status: 500,
      timestamp: new Date().toISOString(),
      description: 'Failed to clear application logs',
      details: { message: error.message }
    });
  }
});

// Add route to serve logs viewer with relaxed authentication
router.get('/viewer', (req, res) => {
  // Make the log viewer accessible without authentication for easier debugging
  // In production, you should re-enable authentication
  res.sendFile(path.join(__dirname, '../public/test/logs-viewer.html'));
});

// Create a test-specific route for checking system functionality
router.get('/test', (req, res) => {
  try {
    // Create a test log entry
    const timestamp = new Date().toISOString();
    const today = timestamp.slice(0, 10);
    const logFile = path.join(logsDir, `app-${today}.log`);
    
    // Create or append to the log file
    fs.appendFileSync(logFile, `[${timestamp}] INFO: Test log entry created via /api/logs/test endpoint\n`);
    
    res.json({ 
      message: 'Test log entry created successfully',
      code: 'LOG_TEST_SUCCESS',
      status: 200,
      timestamp
    });
  } catch (error) {
    console.error(`Error creating test log [SERVER_LOG_005] Status: 500 - ${error.message}`, {
      stack: error.stack
    });
    
    res.status(500).json({ 
      error: 'Failed to create test log entry', 
      code: 'SERVER_LOG_005',
      status: 500,
      timestamp: new Date().toISOString(),
      description: 'Failed to create test log entry',
      details: { message: error.message }
    });
  }
});

module.exports = router;