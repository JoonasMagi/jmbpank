require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const cors = require('cors');
const errorHandler = require('./routes/errorHandler');

// Set development mode if not specified
if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'development';
}

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

// Save original console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;
const originalConsoleDebug = console.debug;

// Create a logger function
const logger = {
  log: message => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] INFO: ${message}`;
    originalConsoleLog(logMessage);
    logStream.write(`${logMessage}\n`);
  },
  error: (message, error) => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ERROR: ${message}${error ? ` - ${error.message}` : ''}`;
    const stackTrace = error ? `\n${error.stack}\n` : '';
    originalConsoleError(logMessage);
    logStream.write(`${logMessage}${stackTrace}\n`);
  },
  warn: message => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] WARN: ${message}`;
    originalConsoleWarn(logMessage);
    logStream.write(`${logMessage}\n`);
  },
  debug: message => {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] DEBUG: ${message}`;
    originalConsoleDebug(logMessage);
    logStream.write(`${logMessage}\n`);
  },
};

// Override console methods to log to file
console.log = function () {
  const args = Array.from(arguments);
  const message = args.join(' ');
  logger.log(message);
};

console.error = function () {
  const args = Array.from(arguments);
  const message = args.join(' ');
  logger.error(message);
};

console.warn = function () {
  const args = Array.from(arguments);
  const message = args.join(' ');
  logger.warn(message);
};

console.debug = function () {
  const args = Array.from(arguments);
  const message = args.join(' ');
  logger.debug(message);
};

// Direct log function for internal use (doesn't call console methods)
function directLog(message) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] INFO: ${message}`;
  originalConsoleLog(logMessage);
  logStream.write(`${logMessage}\n`);
}

// Initialize database first
const db = require('./models/db');

// Log database initialization
directLog('Database initialization started');

// Initialize Express app
const app = express();

// Configure CORS with specific options
app.use(
  cors({
    origin: '*', // Allow all origins for now
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

// Parse JSON bodies with larger size limit
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded bodies with larger size limit
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Log initial application startup
directLog('JMB Pank application starting up');
directLog(`Environment: ${process.env.NODE_ENV}`);

// Initialize crypto service (generate NEW keys in memory on startup)
try {
  const CryptoService = require('./services/cryptoService');
  // Generate a new key pair on each startup with forceNew=true
  CryptoService.createAndStoreKeyPair('1', true)
    .then(() => {
      directLog('RSA key pair generated and stored in memory successfully');
    })
    .catch(err => {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] ERROR: Failed to initialize crypto keys: ${err.message}`;
      originalConsoleError(logMessage);
      logStream.write(`${logMessage}\n${err.stack}\n`);
    });
} catch (err) {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ERROR: Error loading CryptoService: ${err.message}`;
  originalConsoleError(logMessage);
  logStream.write(`${logMessage}\n${err.stack}\n`);
}

// Routes
const accountRoutes = require('./routes/accountRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const userRoutes = require('./routes/userRoutes');
const sessionRoutes = require('./routes/sessionRoutes');
const logRoutes = require('./routes/logRoutes');
const testRoutes = require('./routes/testRoutes');

// Swagger configuration
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'JMB Pank API',
      version: '1.0.0',
      description: 'Simple bank API that supports interbank transactions',
      contact: {
        name: 'Joonas Mägi',
      },
    },
    servers: [
      {
        url: `/api`,
        description: 'API Base URL',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./controllers/*.js'],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);

// API routes with base path
const apiRouter = express.Router();
app.use('/api', apiRouter);

// Mount Swagger UI at /api-docs
apiRouter.use(
  '/docs',
  swaggerUi.serve,
  swaggerUi.setup(swaggerDocs, {
    explorer: true,
  })
);

// Special route for JWKS as .json file - needed for central bank registration
app.get('/api/transactions/jwks', async (req, res) => {
  try {
    const CryptoService = require('./services/cryptoService');
    const jwks = await CryptoService.getJWKS();
    res.json(jwks);
  } catch (error) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ERROR: Error getting JWKS: ${error.message}`;
    originalConsoleError(logMessage);
    logStream.write(`${logMessage}\n${error.stack}\n`);
    res.status(500).json({ error: 'Failed to get JWKS' });
  }
});

// Handle the legacy /jwks.json route by redirecting to the proper endpoint
app.get('/jwks.json', (req, res) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] WARN: Legacy JWKS endpoint accessed at /jwks.json, redirecting to /api/transactions/jwks`;
  originalConsoleWarn(logMessage);
  logStream.write(`${logMessage}\n`);
  res.redirect('/api/transactions/jwks');
});

// Root route for API
apiRouter.get('/', (req, res) => {
  // Get the base URL for central bank endpoints
  const baseUrl = `${req.protocol}://${req.get('host')}`;

  res.json({
    message: 'Welcome to JMB Pank API',
    environment: process.env.NODE_ENV,
    documentation: '/api/docs',
    endpoints: {
      users: '/api/users',
      accounts: '/api/accounts',
      transactions: '/api/transactions',
      sessions: '/api/sessions',
      logs: '/api/logs',
      test: process.env.NODE_ENV !== 'production' ? '/api/test' : null,
    },
    centralBankEndpoints: {
      jwksUrl: `${baseUrl}/api/transactions/jwks`,
      transactionUrl: `${baseUrl}/api/transactions/b2b`,
    },
  });
});

// Log requests
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const message = `[${timestamp}] REQUEST: ${req.method} ${req.url} - User: ${req.user ? req.user.username : 'anonymous'}`;

  // Write to log file - directly to avoid infinite recursion
  logStream.write(`${message}\n`);
  originalConsoleLog(message);

  // Log request body for non-GET requests (except for sensitive endpoints)
  if (req.method !== 'GET' && !req.url.includes('/login') && !req.url.includes('/register')) {
    const bodyLog = `[${timestamp}] REQUEST BODY: ${JSON.stringify(req.body)}`;
    logStream.write(`${bodyLog}\n`);
    originalConsoleLog(bodyLog);
  }

  // Capture the response
  const originalSend = res.send;
  res.send = function (body) {
    // Log response status
    const responseLog = `[${timestamp}] RESPONSE: ${req.method} ${req.url} - Status: ${res.statusCode}`;
    logStream.write(`${responseLog}\n`);
    originalConsoleLog(responseLog);

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
      const errorLog = `[${timestamp}] RESPONSE ERROR: ${JSON.stringify(responseBody)}`;
      logStream.write(`${errorLog}\n`);
      originalConsoleError(errorLog);
    }

    originalSend.call(this, body);
  };

  next();
});

// API endpoints - mount these AFTER the request logging middleware
apiRouter.use('/accounts', accountRoutes);
apiRouter.use('/transactions', transactionRoutes);
apiRouter.use('/users', userRoutes);
apiRouter.use('/sessions', sessionRoutes);
apiRouter.use('/logs', logRoutes);

// Development-only test routes
if (process.env.NODE_ENV !== 'production') {
  apiRouter.use('/test', testRoutes);
  console.log('Test routes enabled - FOR DEVELOPMENT USE ONLY');
}

// Root app route
app.get('/', (req, res) => {
  res.redirect('/api');
});

// Add the custom error handler middleware as the last middleware
app.use(errorHandler);

// Simulate some initial log messages for testing - use direct logging to avoid recursion
logStream.write(`[${new Date().toISOString()}] INFO: Application initialization completed\n`);
logStream.write(`[${new Date().toISOString()}] WARN: This is a test warning message\n`);
logStream.write(`[${new Date().toISOString()}] ERROR: This is a test error message - Test error\n`);
logStream.write(
  `[${new Date().toISOString()}] DEBUG: This is a debug message with details about the environment\n`
);

// Generate some sample transactions for logging
setTimeout(() => {
  logStream.write(
    `[${new Date().toISOString()}] INFO: Sample transaction processed: transfer of €1000 from account JMB123 to account JMB456\n`
  );
  logStream.write(`[${new Date().toISOString()}] INFO: User johndoe logged in successfully\n`);
  logStream.write(
    `[${new Date().toISOString()}] WARN: Failed login attempt for user testuser - Invalid credentials\n`
  );
  logStream.write(`[${new Date().toISOString()}] ERROR: Transaction failed - Insufficient funds\n`);
}, 2000);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  directLog(`JMB Pank server running on port ${PORT}`);
  directLog(`API Documentation available at http://localhost:${PORT}/api/docs`);
  directLog(`JWKS available at http://localhost:${PORT}/api/transactions/jwks`);
});
