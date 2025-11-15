// api/emails/process-queue.js
// Process scheduled email queue (run via cron job)
const { Resend } = require('resend');

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Require API key for security
  // Vercel cron jobs automatically add a secret header, but we'll use a custom key for extra security
  const apiKey = req.headers['x-api-key'] || req.query.apiKey || req.headers['authorization']?.replace('Bearer ', '');
  const expectedKey = process.env.EMAIL_QUEUE_API_KEY;
  
  // If EMAIL_QUEUE_API_KEY is not set, allow access (for development)
  // In production, always require the key
  if (expectedKey && apiKey !== expectedKey) {
    console.error('Unauthorized access attempt to email queue processor');
    return res.status(401).json({ success: false, error: 'Unauthorized - Invalid API key' });
  }
  
  // Log successful authentication (without exposing the key)
  if (expectedKey && apiKey === expectedKey) {
    console.log('✅ Authorized email queue processor access');
  }

  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmail = process.env.FROM_EMAIL || 'hello@hatchepk.com';

    // Get pending emails scheduled for now or earlier
    const now = new Date().toISOString();
    const { data: pendingEmails, error: fetchError } = await supabase
      .from('email_queue')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_for', now)
      .limit(50); // Process 50 at a time

    if (fetchError) {
      throw fetchError;
    }

    if (!pendingEmails || pendingEmails.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No pending emails to process',
        processed: 0
      });
    }

    let processed = 0;
    let failed = 0;

    // Process each email
    for (const emailItem of pendingEmails) {
      try {
        // Check email preferences
        const { data: preferences } = await supabase
          .from('email_preferences')
          .select('*')
          .eq('email', emailItem.user_email)
          .maybeSingle();

        // Skip if user unsubscribed or disabled this email type
        if (preferences && preferences.unsubscribed) {
          await supabase
            .from('email_queue')
            .update({ status: 'skipped', reason: 'user_unsubscribed' })
            .eq('id', emailItem.id);
          continue;
        }

        // Use unified email endpoint
        const endpoint = '/api/emails/send';

        // Send email via internal API call
        const emailData = {
          emailType: emailItem.email_type,
          ...emailItem.email_data,
          email: emailItem.user_email
        };

        // Call the email sending endpoint
        const emailResponse = await fetch(`${process.env.SITE_URL || 'https://hatchepk.com'}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(emailData),
        });

        if (emailResponse.ok) {
          await supabase
            .from('email_queue')
            .update({ 
              status: 'sent', 
              sent_at: new Date().toISOString() 
            })
            .eq('id', emailItem.id);
          processed++;
        } else {
          throw new Error(`Email API returned ${emailResponse.status}`);
        }

      } catch (error) {
        console.error(`Error processing email ${emailItem.id}:`, error);
        await supabase
          .from('email_queue')
          .update({ 
            status: 'failed', 
            error_message: error.message,
            retry_count: (emailItem.retry_count || 0) + 1
          })
          .eq('id', emailItem.id);
        failed++;
      }
    }

    return res.status(200).json({
      success: true,
      processed,
      failed,
      total: pendingEmails.length
    });

  } catch (error) {
    console.error('❌ Error processing email queue:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to process email queue'
    });
  }
};

