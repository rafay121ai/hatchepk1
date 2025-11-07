/**
 * Vercel Serverless Function: Validate Influencer Access Code
 * POST /api/influencer/validate-code
 */

const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

// Initialize Supabase with service role key (for RLS bypass)
const supabaseUrl = 'https://smlmbqgqkijodbxfpqen.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNtbG1icWdxa2lqb2RieGZwcWVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEyNDIxOTQsImV4cCI6MjA3NjgxODE5NH0.FBFN5O8rZIPx0DJTFPto6VokT_VgLZiJeCQcWkLej1w';
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Resend
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Send email notification when code is used
 */
async function sendAccessNotification(accessCode, ipAddress) {
  try {
    const now = new Date();
    const pakistanTime = now.toLocaleString('en-US', { 
      timeZone: 'Asia/Karachi',
      dateStyle: 'full',
      timeStyle: 'long'
    });

    await resend.emails.send({
      from: 'hello@hatchepk.com',
      to: 'essanirafay@gmail.com',
      subject: `🔑 Influencer Code Used: ${accessCode.code}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #73160f; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
            .content { background: #f9f9f9; padding: 20px; border: 1px solid #ddd; }
            .detail { margin: 10px 0; padding: 10px; background: white; border-left: 4px solid #73160f; }
            .detail strong { color: #73160f; }
            .footer { margin-top: 20px; font-size: 12px; color: #666; text-align: center; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2 style="margin: 0;">🎓 Influencer Access Code Used</h2>
            </div>
            <div class="content">
              <div class="detail">
                <strong>Access Code:</strong> ${accessCode.code}
              </div>
              <div class="detail">
                <strong>Influencer:</strong> ${accessCode.influencer_name}
              </div>
              <div class="detail">
                <strong>Guide:</strong> ${accessCode.guides.title}
              </div>
              <div class="detail">
                <strong>Time (Pakistan):</strong> ${pakistanTime}
              </div>
              <div class="detail">
                <strong>IP Address:</strong> ${ipAddress}
              </div>
              <div class="detail">
                <strong>Expires:</strong> ${new Date(accessCode.expires_at).toLocaleString('en-US', { timeZone: 'Asia/Karachi' })}
              </div>
            </div>
            <div class="footer">
              <p>This is an automated notification from HatchePK</p>
            </div>
          </div>
        </body>
        </html>
      `
    });
    
    console.log('✅ Email notification sent');
  } catch (error) {
    console.error('❌ Email notification error:', error);
    // Don't throw - email failure shouldn't block access
  }
}

/**
 * Log access attempt
 */
async function logAccess(accessCodeId, actionType, deviceFingerprint, ipAddress, userAgent, errorMessage, metadata) {
  try {
    await supabase.from('access_code_logs').insert({
      access_code_id: accessCodeId,
      action_type: actionType,
      device_fingerprint: deviceFingerprint,
      ip_address: ipAddress,
      user_agent: userAgent,
      error_message: errorMessage,
      metadata: metadata
    });
  } catch (error) {
    console.error('Logging error:', error);
  }
}

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
    const { code, deviceFingerprint } = req.body;
    const ipAddress = req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    console.log('=== VALIDATE CODE REQUEST ===');
    console.log('Code:', code);
    console.log('Device FP:', deviceFingerprint?.substring(0, 20) + '...');
    console.log('IP:', ipAddress);

    // Validate input
    if (!code || !deviceFingerprint) {
      return res.status(400).json({ error: 'Code and device fingerprint required' });
    }

    // 1. Fetch access code with guide details (JOIN with guides table)
    const { data: accessCode, error: codeError } = await supabase
      .from('access_codes')
      .select(`
        *,
        guides (
          id,
          title,
          slug,
          file_url
        )
      `)
      .eq('code', code.toLowerCase().trim())
      .eq('is_active', true)
      .single();

    if (codeError || !accessCode) {
      console.log('❌ Invalid code');
      await logAccess(null, 'access_denied', deviceFingerprint, ipAddress, userAgent, 'Invalid code');
      return res.status(404).json({ error: 'Invalid or inactive access code' });
    }

    // 2. Check expiry
    if (new Date(accessCode.expires_at) < new Date()) {
      console.log('❌ Code expired');
      await logAccess(accessCode.id, 'access_denied', deviceFingerprint, ipAddress, userAgent, 'Code expired');
      return res.status(403).json({ error: 'Access code has expired' });
    }

    // 3. Clean up old/inactive sessions (>5 days old)
    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);
    
    await supabase
      .from('access_code_sessions')
      .delete()
      .eq('access_code_id', accessCode.id)
      .lt('last_accessed_at', fiveDaysAgo.toISOString());

    console.log('✓ Cleaned up old sessions (>5 days)');

    // 4. Check device limit (only active sessions)
    const { data: existingSessions, error: sessionsError } = await supabase
      .from('access_code_sessions')
      .select('device_fingerprint, last_accessed_at')
      .eq('access_code_id', accessCode.id);

    if (sessionsError) {
      console.error('Sessions error:', sessionsError);
      throw sessionsError;
    }

    const uniqueDevices = new Set(existingSessions.map(s => s.device_fingerprint));
    const isExistingDevice = uniqueDevices.has(deviceFingerprint);

    console.log('Active devices:', uniqueDevices.size);
    console.log('Is existing device:', isExistingDevice);
    console.log('Max devices:', accessCode.max_devices);

    if (!isExistingDevice && uniqueDevices.size >= accessCode.max_devices) {
      console.log('❌ Device limit reached');
      await logAccess(
        accessCode.id, 
        'device_limit_reached', 
        deviceFingerprint, 
        ipAddress, 
        userAgent, 
        `Maximum ${accessCode.max_devices} devices reached`
      );
      return res.status(403).json({ 
        error: `This code is already active on ${accessCode.max_devices} device(s). Please use one of your existing devices or contact support.` 
      });
    }

    // 5. Create or update session
    const sessionToken = crypto.randomBytes(32).toString('hex');
    
    const { data: session, error: sessionError } = await supabase
      .from('access_code_sessions')
      .upsert({
        access_code_id: accessCode.id,
        device_fingerprint: deviceFingerprint,
        session_token: sessionToken,
        ip_address: ipAddress,
        user_agent: userAgent,
        last_accessed_at: new Date().toISOString()
      }, {
        onConflict: 'access_code_id,device_fingerprint'
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Session error:', sessionError);
      throw sessionError;
    }

    // 6. Log successful access
    await logAccess(
      accessCode.id, 
      'code_validated', 
      deviceFingerprint, 
      ipAddress, 
      userAgent, 
      null, 
      {
        isNewDevice: !isExistingDevice,
        totalDevices: uniqueDevices.size + (isExistingDevice ? 0 : 1)
      }
    );

    // 7. Send email notification (non-blocking)
    sendAccessNotification(accessCode, ipAddress).catch(console.error);

    // 8. Return success with session token
    console.log('✅ Code validated successfully');
    
    // Extract guide details from the joined guides table
    const guideDetails = accessCode.guides;
    
    return res.status(200).json({
      success: true,
      sessionToken: session.session_token,
      guideId: guideDetails.id,
      guideSlug: guideDetails.slug,
      guideTitle: guideDetails.title,
      influencerName: accessCode.influencer_name,
      expiresAt: accessCode.expires_at
    });

  } catch (error) {
    console.error('❌ Validate code error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

