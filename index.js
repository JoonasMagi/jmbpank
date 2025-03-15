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

// Initialize database first
const db = require('./models/db');

// Initialize Express app
const app = express();

// Enable CORS for all routes
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Initialize crypto service (generate keys on startup) after the database is set up
setTimeout(() => {
  const CryptoService = require('./services/cryptoService');
  CryptoService.createAndStoreKeyPair('1').catch(err => {
    console.error('Failed to initialize crypto keys:', err);
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

// Special route for JWKS as .json file - needed for central bank registration
app.get('/api/transactions/jwks', async (req, res) => {
  try {
    const CryptoService = require('./services/cryptoService');
    const jwks = await CryptoService.getJWKS();
    res.json(jwks);
  } catch (error) {
    console.error('Error getting JWKS:', error);
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

// Setup logging to file
const logFile = path.join(logsDir, `app-${new Date().toISOString().slice(0, 10)}.log`);
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

// Log requests
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const message = `[${timestamp}] ${req.method} ${req.url} - User: ${req.user ? req.user.username : 'anonymous'}`;
  
  // Write to log file
  logStream.write(`${message}\n`);
  
  // Continue with request
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  const timestamp = new Date().toISOString();
  const errorMsg = `[${timestamp}] ERROR: ${err.stack}`;
  
  // Log to console
  console.error(errorMsg);
  
  // Write to log file
  logStream.write(`${errorMsg}\n`);
  
  res.status(500).json({
    error: 'Server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  const message = `JMB Pank server running on port ${PORT}`;
  console.log(message);
  logStream.write(`[${new Date().toISOString()}] ${message}\n`);
  
  console.log(`API Documentation available at http://localhost:${PORT}/api/docs`);
  console.log(`JWKS available at http://localhost:${PORT}/api/transactions/jwks`);
});