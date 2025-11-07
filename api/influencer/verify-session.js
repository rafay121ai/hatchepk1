/**
 * Vercel Serverless Function: Verify Influencer Session
 * POST /api/influencer/verify-session
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase with service role key
const supabaseUrl = 'https://smlmbqgqkijodbxfpqen.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtbG1icWdxa2lqb2RieGZwcWVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNDIxOTQsImV4cCI6MjA3NjgxODE5NH0.FBFN5O8rZIPx0DJTFPto6VokT_VgLZiJeCQcWkLej1w';
const supabase = createClient(supabaseUrl, supabaseKey);

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
    const { sessionToken, deviceFingerprint } = req.body;

    console.log('=== VERIFY SESSION REQUEST ===');
    console.log('Session token:', sessionToken?.substring(0, 20) + '...');
    console.log('Device FP:', deviceFingerprint?.substring(0, 20) + '...');

    if (!sessionToken || !deviceFingerprint) {
      return res.status(400).json({ error: 'Session token and device fingerprint required' });
    }

    // 1. Fetch session with access code
    const { data: session, error: sessionError } = await supabase
      .from('access_code_sessions')
      .select(`
        *,
        access_codes (*)
      `)
      .eq('session_token', sessionToken)
      .eq('device_fingerprint', deviceFingerprint)
      .single();

    if (sessionError || !session) {
      console.log('❌ Invalid session');
      return res.status(401).json({ error: 'Invalid session' });
    }

    // 2. Get access code details
    const accessCode = session.access_codes;
    
    if (!accessCode) {
      console.log('❌ Access code not found');
      return res.status(401).json({ error: 'Access code not found' });
    }

    // 3. Check if access code is still valid
    if (!accessCode.is_active) {
      console.log('❌ Access code deactivated');
      return res.status(403).json({ error: 'Access code has been deactivated' });
    }

    if (new Date(accessCode.expires_at) < new Date()) {
      console.log('❌ Access code expired');
      return res.status(403).json({ error: 'Access code has expired' });
    }

    // 4. Update last accessed time (heartbeat)
    await supabase
      .from('access_code_sessions')
      .update({ last_accessed_at: new Date().toISOString() })
      .eq('id', session.id);

    // 5. Log guide view
    await supabase.from('access_code_logs').insert({
      access_code_id: accessCode.id,
      action_type: 'guide_viewed',
      device_fingerprint: deviceFingerprint,
      ip_address: req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown',
      user_agent: req.headers['user-agent'] || 'unknown',
      metadata: {
        session_id: session.id
      }
    });

    console.log('✅ Session valid');

    // 6. Return success
    return res.status(200).json({
      valid: true,
      guideSlug: accessCode.guide_slug,
      guideId: accessCode.guide_id,
      guideTitle: accessCode.guide_title,
      expiresAt: accessCode.expires_at,
      influencerName: accessCode.influencer_name
    });

  } catch (error) {
    console.error('❌ Verify session error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

