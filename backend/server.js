/**
 * Backend Server for PayFast Payment Gateway
 * 
 * This server handles PayFast payment integration including:
 * - Token generation API (/api/payment/get-token)
 * - IPN webhook handler (/api/payment/webhook)
 * 
 * Run: node server.js
 * Development: npm run dev (with nodemon)
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env.local') });
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const paymentRoutes = require('./api/payment');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.NEXT_PUBLIC_APP_URL || process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'PayFast Payment API',
    timestamp: new Date().toISOString(),
    merchantId: process.env.PAYFAST_MERCHANT_ID ? 'configured' : 'missing'
  });
});

// Payment API routes
app.use('/api/payment', paymentRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 PayFast Payment API Server running on port ${PORT}`);
  console.log(`📍 Health check: http://localhost:${PORT}/health`);
  console.log(`🔑 Get token: http://localhost:${PORT}/api/payment/get-token`);
  console.log(`📥 IPN webhook: http://localhost:${PORT}/api/payment/webhook\n`);
  
  // Validate environment variables
  const requiredEnvVars = ['PAYFAST_MERCHANT_ID', 'PAYFAST_SECURED_KEY', 'PAYFAST_TOKEN_API_URL'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn('⚠️  WARNING: Missing environment variables:');
    missingVars.forEach(varName => console.warn(`   - ${varName}`));
    console.warn('   Please check your .env.local file\n');
  } else {
    console.log('✅ All PayFast credentials configured\n');
  }
});

module.exports = app;

