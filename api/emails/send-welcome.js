// api/emails/send-welcome.js
// Send welcome email immediately after signup
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
    const { firstName, email, topGuideUrl = 'https://hatchepk.com/our-guides' } = req.body;

    // Validate required fields
    if (!email || !firstName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email and firstName'
      });
    }

    // Initialize Resend
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmail = process.env.FROM_EMAIL || 'hello@hatchepk.com';

    // Create mobile-optimized HTML email (40-50 char subject, single column)
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Hatche!</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Georgia', serif; background-color: #fdfcf1;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fdfcf1; padding: 20px;">
            <tr>
              <td align="center">
                <table width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(115, 22, 15, 0.1);">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #73160f 0%, #8b1a13 100%); padding: 30px 20px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600; letter-spacing: 2px;">HATCHE</h1>
                    </td>
                  </tr>

                  <!-- Main content -->
                  <tr>
                    <td style="padding: 30px 20px;">
                      <h2 style="color: #2c2c2c; font-size: 22px; margin: 0 0 15px;">Welcome to Hatche! 🚀</h2>
                      
                      <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                        Hi <strong style="color: #73160f;">${firstName}</strong>,
                      </p>

                      <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                        Welcome to our community of learners! We're excited to help you master your craft and build your influence, income, and identity.
                      </p>

                      <!-- What to expect -->
                      <div style="background-color: #fdfcf1; border-radius: 12px; padding: 20px; margin: 20px 0;">
                        <h3 style="color: #73160f; font-size: 18px; margin: 0 0 15px;">Here's what you can expect:</h3>
                        <ul style="color: #666; font-size: 15px; line-height: 1.8; padding-left: 20px; margin: 0;">
                          <li>✓ Weekly expert guides delivered to your inbox</li>
                          <li>✓ Exclusive tips and resources</li>
                          <li>✓ Early access to new tutorials</li>
                        </ul>
                      </div>

                      <!-- CTA Button -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                        <tr>
                          <td align="center">
                            <a href="${topGuideUrl}" style="display: inline-block; background: linear-gradient(135deg, #73160f 0%, #8b1a13 100%); color: #ffffff; text-decoration: none; padding: 15px 30px; border-radius: 10px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(115, 22, 15, 0.3);">
                              Get Started with Our Top Guide →
                            </a>
                          </td>
                        </tr>
                      </table>

                      <p style="color: #666; font-size: 15px; line-height: 1.6; margin: 20px 0 0;">
                        Happy learning!<br>
                        <strong style="color: #73160f;">The Hatche Team</strong>
                      </p>
                    </td>
                  </tr>

                  <!-- Footer with unsubscribe -->
                  <tr>
                    <td style="background-color: #fdfcf1; padding: 20px; text-align: center; border-top: 3px solid #73160f;">
                      <p style="color: #666; font-size: 13px; margin: 0 0 10px;">
                        Questions? <a href="mailto:hello@hatchepk.com" style="color: #73160f; text-decoration: none;">hello@hatchepk.com</a>
                      </p>
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
      subject: 'Welcome to Hatche! Your first guide is here 🚀',
      html: htmlContent,
      tags: [{ name: 'email-type', value: 'welcome' }],
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(400).json({ success: false, error: error.message });
    }

    console.log('✅ Welcome email sent:', data);
    return res.status(200).json({ success: true, data });

  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to send email'
    });
  }
};

