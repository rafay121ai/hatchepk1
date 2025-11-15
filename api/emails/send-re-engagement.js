// api/emails/send-re-engagement.js
// Send re-engagement email after 7 days of inactivity
const { Resend } = require('resend');

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const { firstName, email, newGuides = [] } = req.body;

    // Validate required fields
    if (!email || !firstName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Initialize Resend
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmail = process.env.FROM_EMAIL || 'hello@hatchepk.com';

    // Generate new guides list HTML
    const guidesList = newGuides.length > 0 
      ? newGuides.map(guide => `
          <tr>
            <td style="padding: 15px; border-bottom: 1px solid #eee;">
              <h3 style="color: #73160f; font-size: 18px; margin: 0 0 5px;">${guide.title || 'New Guide'}</h3>
              <p style="color: #666; font-size: 14px; margin: 0;">${guide.description || 'Check out our latest guide!'}</p>
              ${guide.url ? `<a href="${guide.url}" style="display: inline-block; margin-top: 10px; color: #73160f; text-decoration: none; font-weight: 600;">View Guide →</a>` : ''}
            </td>
          </tr>
        `).join('')
      : `
          <tr>
            <td style="padding: 15px;">
              <p style="color: #666; font-size: 15px;">We're constantly adding new guides to help you grow!</p>
            </td>
          </tr>
        `;

    // Create mobile-optimized HTML email
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Miss us? Here's what's new</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Georgia', serif; background-color: #fdfcf1;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fdfcf1; padding: 20px;">
            <tr>
              <td align="center">
                <table width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(115, 22, 15, 0.1);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #73160f 0%, #8b1a13 100%); padding: 30px 20px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">HATCHE</h1>
                    </td>
                  </tr>

                  <!-- Main content -->
                  <tr>
                    <td style="padding: 30px 20px;">
                      <h2 style="color: #2c2c2c; font-size: 22px; margin: 0 0 15px;">Miss us? Here's what's new at Hatche</h2>
                      
                      <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                        Hi <strong style="color: #73160f;">${firstName}</strong>,
                      </p>

                      <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                        It's been a week! We've been busy creating new guides you might love:
                      </p>

                      <!-- New guides list -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fdfcf1; border-radius: 12px; margin: 20px 0; overflow: hidden;">
                        ${guidesList}
                      </table>

                      <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 30px 0 20px;">
                        What would you like to learn next?
                      </p>

                      <!-- Reply CTA -->
                      <div style="background-color: #fdfcf1; border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
                        <p style="color: #666; font-size: 15px; margin: 0 0 10px;">
                          <a href="mailto:hello@hatchepk.com?subject=Topic%20Suggestion" style="color: #73160f; text-decoration: none; font-weight: 600;">Reply with your topic →</a>
                        </p>
                      </div>

                      <p style="color: #666; font-size: 15px; line-height: 1.6; margin: 30px 0 0;">
                        See you soon!<br>
                        <strong style="color: #73160f;">The Hatche Team</strong>
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #fdfcf1; padding: 20px; text-align: center; border-top: 3px solid #73160f;">
                      <p style="color: #999; font-size: 12px; margin: 10px 0 0;">
                        <a href="https://hatchepk.com/unsubscribe?email=${encodeURIComponent(email)}" style="color: #999; text-decoration: underline;">Unsubscribe</a> | 
                        <a href="https://hatchepk.com/email-preferences?email=${encodeURIComponent(email)}" style="color: #999; text-decoration: underline;">Email Preferences</a>
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    // Send email
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [email],
      subject: 'Miss us? Here\'s what\'s new at Hatche',
      html: htmlContent,
      tags: [{ name: 'email-type', value: 're-engagement' }],
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(400).json({ success: false, error: error.message });
    }

    console.log('✅ Re-engagement email sent:', data);
    return res.status(200).json({ success: true, data });

  } catch (error) {
    console.error('❌ Error sending re-engagement email:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to send email'
    });
  }
};

