require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Create data directory if not exists
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database first
const db = require('./models/db');

// Initialize Express app
const app = express();
app.use(express.json());

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
        url: `http://localhost:${process.env.PORT || 3000}`,
        description: 'Development server'
      }
    ]
  },
  apis: ['./controllers/*.js']
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// API routes
app.use('/accounts', accountRoutes);
app.use('/transactions', transactionRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to JMB Pank API',
    documentation: '/api-docs'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`JMB Pank server running on port ${PORT}`);
  console.log(`API Documentation available at http://localhost:${PORT}/api-docs`);
});