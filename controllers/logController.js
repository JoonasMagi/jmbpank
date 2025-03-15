const fs = require('fs');
const path = require('path');

/**
 * @swagger
 * /logs:
 *   get:
 *     summary: Get application logs
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: lines
 *         schema:
 *           type: integer
 *         description: Number of log lines to retrieve (default: 100)
 *     responses:
 *       200:
 *         description: Log entries
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 logs:
 *                   type: array
 *                   items:
 *                     type: string
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
exports.getLogs = async (req, res) => {
  try {
    // This endpoint should only be accessible by authenticated users
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // Number of lines to retrieve (default: 100)
    const lines = parseInt(req.query.lines) || 100;
    
    // Get available log files
    const logFiles = getLogFiles();
    
    if (logFiles.length === 0) {
      return res.json({ logs: ['No log files found'] });
    }
    
    // Get latest log file
    const latestLogFile = logFiles[0];
    
    // Read log content
    const logContent = readLogFile(latestLogFile, lines);
    
    res.json({ 
      logs: logContent,
      file: path.basename(latestLogFile),
      available_files: logFiles.map(file => path.basename(file))
    });
  } catch (error) {
    console.error('Error retrieving logs:', error);
    res.status(500).json({ error: 'Failed to retrieve logs' });
  }
};

/**
 * @swagger
 * /logs/{filename}:
 *   get:
 *     summary: Get specific log file
 *     tags: [Logs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: filename
 *         schema:
 *           type: string
 *         required: true
 *         description: Log filename
 *       - in: query
 *         name: lines
 *         schema:
 *           type: integer
 *         description: Number of log lines to retrieve (default: 100)
 *     responses:
 *       200:
 *         description: Log entries
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 logs:
 *                   type: array
 *                   items:
 *                     type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Log file not found
 *       500:
 *         description: Server error
 */
exports.getLogFile = async (req, res) => {
  try {
    // This endpoint should only be accessible by authenticated users
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const filename = req.params.filename;
    const lines = parseInt(req.query.lines) || 100;
    
    // Get available log files
    const logFiles = getLogFiles();
    
    // Find the requested log file
    const logFile = logFiles.find(file => path.basename(file) === filename);
    
    if (!logFile) {
      return res.status(404).json({ error: 'Log file not found' });
    }
    
    // Read log content
    const logContent = readLogFile(logFile, lines);
    
    res.json({ 
      logs: logContent,
      file: path.basename(logFile)
    });
  } catch (error) {
    console.error('Error retrieving log file:', error);
    res.status(500).json({ error: 'Failed to retrieve log file' });
  }
};

/**
 * Get available log files
 * @returns {Array} List of log file paths sorted by modification time (newest first)
 */
function getLogFiles() {
  try {
    // Default log directory
    const logDir = process.env.LOG_DIR || path.join(__dirname, '../logs');
    
    // Create logs directory if it doesn't exist
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
      return [];
    }
    
    // Get all log files
    const files = fs.readdirSync(logDir)
      .filter(file => file.endsWith('.log'))
      .map(file => path.join(logDir, file));
    
    // Sort by modification time (newest first)
    files.sort((a, b) => {
      return fs.statSync(b).mtime.getTime() - fs.statSync(a).mtime.getTime();
    });
    
    return files;
  } catch (error) {
    console.error('Error getting log files:', error);
    return [];
  }
}

/**
 * Read log file and return the specified number of lines
 * @param {string} filePath - Path to log file
 * @param {number} linesCount - Number of lines to retrieve
 * @returns {Array} Array of log lines
 */
function readLogFile(filePath, linesCount) {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return [`Log file not found: ${filePath}`];
    }
    
    // Read file content
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Split into lines and get the last N lines
    const lines = fileContent.split('\n');
    return lines.filter(Boolean).slice(-linesCount);
  } catch (error) {
    console.error(`Error reading log file ${filePath}:`, error);
    return [`Error reading log file: ${error.message}`];
  }
}