/**
 * Vercel Serverless Function: Test Environment Variables
 * 
 * GET /api/payment/test-env
 * 
 * This endpoint helps debug environment variable configuration in Vercel.
 * DO NOT expose in production - remove after testing.
 */

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET method
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method Not Allowed. Use GET.'
    });
  }

  // Check which environment variables are set (don't show actual values for security)
  const envCheck = {
    PAYFAST_MERCHANT_ID: !!process.env.PAYFAST_MERCHANT_ID,
    PAYFAST_SECURED_KEY: !!process.env.PAYFAST_SECURED_KEY,
    PAYFAST_TOKEN_API_URL: !!process.env.PAYFAST_TOKEN_API_URL,
    PAYFAST_FORM_POST_URL: !!process.env.PAYFAST_FORM_POST_URL,
    PAYFAST_MERCHANT_NAME: !!process.env.PAYFAST_MERCHANT_NAME,
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
    SUPABASE_KEY: !!process.env.SUPABASE_KEY,
  };

  // Show which ones are missing
  const missing = Object.entries(envCheck)
    .filter(([key, value]) => !value)
    .map(([key]) => key);

  const allPayFastVars = Object.keys(process.env).filter(k => k.includes('PAYFAST'));

  return res.status(200).json({
    success: true,
    message: 'Environment variables check',
    environmentVariables: envCheck,
    missingVariables: missing,
    availablePayFastVars: allPayFastVars,
    totalEnvVars: Object.keys(process.env).length,
    nodeEnv: process.env.NODE_ENV || 'not set',
    vercelEnv: process.env.VERCEL_ENV || 'not set',
    timestamp: new Date().toISOString()
  });
};

