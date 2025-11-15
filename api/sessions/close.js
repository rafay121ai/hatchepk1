/**
 * Vercel Serverless Function: Close Session
 * POST /api/sessions/close
 * Used for reliable session cleanup on tab close
 */
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://smlmbqgqkijodbxfpqen.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('Missing Supabase key');
}

const supabase = supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID required' });
    }

    if (!supabase) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    // Delete the session
    const { error } = await supabase
      .from('active_sessions')
      .delete()
      .eq('session_id', sessionId);

    if (error) {
      console.error('Error closing session:', error);
      return res.status(500).json({ error: 'Failed to close session' });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error in close session:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

