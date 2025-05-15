// Error handling middleware

/**
 * Error handler middleware
 * Ensures proper CORS headers are set on error responses and
 * formats errors consistently as JSON
 */
const errorHandler = (err, req, res, next) => {
  // Log the error
  console.error(`Error processing ${req.method} ${req.url}:`, err);
  console.error(err.stack);

  // Set status code (default to 500 if not set)
  const statusCode = res.statusCode !== 200 ? res.statusCode : 500;

  // Always set proper content type
  res.setHeader('Content-Type', 'application/json');

  // Add CORS headers (in case they weren't added by earlier middleware)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Send JSON response
  res.status(statusCode).json({
    error: err.message || 'Internal Server Error',
    details: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
  });
};

module.exports = errorHandler;
