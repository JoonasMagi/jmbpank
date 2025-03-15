require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const cors = require('cors');

// Create data directory if not exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Create logs directory if not exists
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Setup logging to file
const logFile = path.join(logsDir, `app-${new Date().toISOString().slice(0, 10)}.log`);
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

// Create a logger function
const logger = {
  log: (message) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] INFO: ${message}`;
    console.log(logMessage);
    logStream.write(`${logMessage}\n`);
  },
  error: (message, error) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ERROR: ${message}${error ? ` - ${error.message}` : ''}`;
    const stackTrace = error ? `\n${error.stack}\n` : '';
    console.error(logMessage);
    logStream.write(`${logMessage}${stackTrace}\n`);
  },
  warn: (message) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] WARN: ${message}`;
    console.warn(logMessage);
    logStream.write(`${logMessage}\n`);
  },
  debug: (message) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] DEBUG: ${message}`;
    console.debug(logMessage);
    logStream.write(`${logMessage}\n`);
  }
};

// Override console methods to log to file
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleDebug = console.debug;

console.log = function() {
  const message = Array.from(arguments).join(' ');
  logger.log(message);
};

console.error = function() {
  const message = Array.from(arguments).join(' ');
  logger.error(message);
};

console.warn = function() {
  const message = Array.from(arguments).join(' ');
  logger.warn(message);
};

console.debug = function() {
  const message = Array.from(arguments).join(' ');
  logger.debug(message);
};

// Initialize database first
const db = require('./models/db');

// Log database initialization
logger.log('Database initialization started');

// Initialize Express app
const app = express();

// Enable CORS for all routes
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Log initial application startup
logger.log('JMB Pank application starting up');

// Initialize crypto service (generate keys on startup) after the database is set up
setTimeout(() => {
  const CryptoService = require('./services/cryptoService');
  CryptoService.createAndStoreKeyPair('1').catch(err => {
    logger.error('Failed to initialize crypto keys:', err);
  });
}, 1000); // Delay crypto initialization to ensure DB tables are created

// Routes
const accountRoutes = require('./routes/accountRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const userRoutes = require('./routes/userRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const logRoutes = require('./routes/logRoutes');

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'JMB Pank API',
      version: '1.0.0',
      description: 'Simple bank API that supports interbank transactions',
      contact: {
        name: 'Joonas Mägi'
      }
    },
    servers: [
      {
        url: `/api`,
        description: 'API Base URL'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: ['./controllers/*.js']
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

// API routes with base path
const apiRouter = express.Router();
app.use('/api', apiRouter);

// Mount Swagger UI at /api-docs
apiRouter.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs, {
  explorer: true
}));

// API endpoints
apiRouter.use('/accounts', accountRoutes);
apiRouter.use('/transactions', transactionRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/sessions', sessionRoutes);
apiRouter.use('/logs', logRoutes);

// Log requests
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const message = `[${timestamp}] REQUEST: ${req.method} ${req.url} - User: ${req.user ? req.user.username : 'anonymous'}`;
  
  // Write to log file
  logStream.write(`${message}\n`);
  
  // Log request body for non-GET requests (except for sensitive endpoints)
  if (req.method !== 'GET' && !req.url.includes('/login') && !req.url.includes('/register')) {
    logStream.write(`[${timestamp}] REQUEST BODY: ${JSON.stringify(req.body)}\n`);
  }
  
  // Capture the response
  const originalSend = res.send;
  res.send = function(body) {
    // Log response status
    logStream.write(`[${timestamp}] RESPONSE: ${req.method} ${req.url} - Status: ${res.statusCode}\n`);
    
    // For error responses, log more details
    if (res.statusCode >= 400) {
      let responseBody = body;
      if (typeof body === 'string' && body.startsWith('{')) {
        try {
          responseBody = JSON.parse(body);
        } catch (err) {
          // If it fails to parse as JSON, keep the original
          responseBody = body;
        }
      }
      logStream.write(`[${timestamp}] RESPONSE ERROR: ${JSON.stringify(responseBody)}\n`);
    }
    
    originalSend.call(this, body);
  };
  
  next();
});

// Special route for JWKS as .json file - needed for central bank registration
app.get('/api/transactions/jwks', async (req, res) => {
  try {
    const CryptoService = require('./services/cryptoService');
    const jwks = await CryptoService.getJWKS();
    res.json(jwks);
  } catch (error) {
    logger.error('Error getting JWKS:', error);
    res.status(500).json({ error: 'Failed to get JWKS' });
  }
});

// Root route
apiRouter.get('/', (req, res) => {
  res.json({
    message: 'Welcome to JMB Pank API',
    documentation: '/api/docs',
    endpoints: {
      users: '/api/users',
      accounts: '/api/accounts',
      transactions: '/api/transactions',
      sessions: '/api/sessions',
      logs: '/api/logs'
    },
    centralBankEndpoints: {
      jwksUrl: 'https://joonasmagi.me/jwks.json',
      transactionUrl: 'https://joonasmagi.me/api/transactions/b2b'
    }
  });
});

// Root app route
app.get('/', (req, res) => {
  res.redirect('/api');
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Error in ${req.method} ${req.url}:`, err);
  
  res.status(500).json({
    error: 'Server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Simulate some initial log messages for testing
logger.log('Application initialization completed');
logger.warn('This is a test warning message');
logger.error('This is a test error message', new Error('Test error'));
logger.debug('This is a debug message with details about the environment');

// Generate some sample transactions for logging
setTimeout(() => {
  logger.log('Sample transaction processed: transfer of €1000 from account JMB123 to account JMB456');
  logger.log('User johndoe logged in successfully');
  logger.warn('Failed login attempt for user testuser - Invalid credentials');
  logger.error('Transaction failed', new Error('Insufficient funds'));
}, 2000);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.log(`JMB Pank server running on port ${PORT}`);
  logger.log(`API Documentation available at http://localhost:${PORT}/api/docs`);
  logger.log(`JWKS available at http://localhost:${PORT}/api/transactions/jwks`);
});