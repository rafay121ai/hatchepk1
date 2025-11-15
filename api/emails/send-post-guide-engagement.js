// api/emails/send-post-guide-engagement.js
// Send engagement email 2 hours after guide view
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
    const { firstName, email, guideTitle, guideId } = req.body;

    // Validate required fields
    if (!email || !firstName || !guideTitle) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Initialize Resend
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmail = process.env.FROM_EMAIL || 'hello@hatchepk.com';

    // Feedback tracking IDs
    const feedbackYesUrl = `https://hatchepk.com/api/feedback/record?guideId=${guideId}&email=${encodeURIComponent(email)}&rating=positive&source=post-guide-email`;
    const feedbackNoUrl = `https://hatchepk.com/api/feedback/record?guideId=${guideId}&email=${encodeURIComponent(email)}&rating=needs-improvement&source=post-guide-email`;

    // Create mobile-optimized HTML email
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Was our guide helpful?</title>
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
                      <h2 style="color: #2c2c2c; font-size: 22px; margin: 0 0 15px;">Was our guide helpful, ${firstName}?</h2>
                      
                      <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                        Hi <strong style="color: #73160f;">${firstName}</strong>,
                      </p>

                      <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                        We noticed you checked out "<strong>${guideTitle}</strong>". We hope it helped you on your journey!
                      </p>

                      <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                        Quick question: Did you find what you were looking for?
                      </p>

                      <!-- Feedback buttons -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                        <tr>
                          <td align="center" style="padding-bottom: 15px;">
                            <a href="${feedbackYesUrl}" style="display: inline-block; background: #4caf50; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 8px; font-size: 16px; font-weight: 600; margin: 0 5px;">
                              ✓ Yes, it was perfect
                            </a>
                          </td>
                        </tr>
                        <tr>
                          <td align="center">
                            <a href="${feedbackNoUrl}" style="display: inline-block; background: #ff9800; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 8px; font-size: 16px; font-weight: 600; margin: 0 5px;">
                              ⚠ Needs improvement
                            </a>
                          </td>
                        </tr>
                      </table>

                      <p style="color: #666; font-size: 15px; line-height: 1.6; margin: 30px 0 0;">
                        Your feedback helps us create better guides for you and our community.
                      </p>

                      <p style="color: #666; font-size: 15px; line-height: 1.6; margin: 20px 0 0;">
                        Need more help? Reply to this email - we read every message.
                      </p>

                      <p style="color: #666; font-size: 15px; line-height: 1.6; margin: 20px 0 0;">
                        Best,<br>
                        <strong style="color: #73160f;">The Hatche Team</strong>
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #fdfcf1; padding: 20px; text-align: center; border-top: 3px solid #73160f;">
                      <p style="color: #999; font-size: 12px; margin: 10px 0 0;">
                        <a href="https://hatchepk.com/unsubscribe?email=${encodeURIComponent(email)}" style="color: #999; text-decoration: underline;">Unsubscribe</a>
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
      subject: `Was our guide helpful, ${firstName}?`,
      html: htmlContent,
      tags: [{ name: 'email-type', value: 'post-guide-engagement' }],
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(400).json({ success: false, error: error.message });
    }

    console.log('✅ Post-guide engagement email sent:', data);
    return res.status(200).json({ success: true, data });

  } catch (error) {
    console.error('❌ Error sending post-guide email:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to send email'
    });
  }
};

