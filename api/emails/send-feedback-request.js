// api/emails/send-feedback-request.js
// Send feedback request 24 hours after interaction
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

    // Rating URLs (1-5 stars)
    const baseUrl = `https://hatchepk.com/api/feedback/record?guideId=${guideId}&email=${encodeURIComponent(email)}&source=feedback-email`;
    const ratingUrls = {
      1: `${baseUrl}&rating=1`,
      2: `${baseUrl}&rating=2`,
      3: `${baseUrl}&rating=3`,
      4: `${baseUrl}&rating=4`,
      5: `${baseUrl}&rating=5`
    };

    // Create mobile-optimized HTML email
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Quick question about your experience</title>
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
                      <h2 style="color: #2c2c2c; font-size: 22px; margin: 0 0 15px;">Quick question about your experience</h2>
                      
                      <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                        Hi <strong style="color: #73160f;">${firstName}</strong>,
                      </p>

                      <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                        You recently used our guide on "<strong>${guideTitle}</strong>". We'd love to hear your thoughts!
                      </p>

                      <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                        How would you rate your experience?
                      </p>

                      <!-- Star rating buttons -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                        <tr>
                          <td align="center" style="padding: 5px;">
                            <a href="${ratingUrls[1]}" style="display: inline-block; padding: 10px 15px; font-size: 24px; text-decoration: none; color: #ffc107;">⭐</a>
                          </td>
                          <td align="center" style="padding: 5px;">
                            <a href="${ratingUrls[2]}" style="display: inline-block; padding: 10px 15px; font-size: 24px; text-decoration: none; color: #ffc107;">⭐⭐</a>
                          </td>
                          <td align="center" style="padding: 5px;">
                            <a href="${ratingUrls[3]}" style="display: inline-block; padding: 10px 15px; font-size: 24px; text-decoration: none; color: #ffc107;">⭐⭐⭐</a>
                          </td>
                          <td align="center" style="padding: 5px;">
                            <a href="${ratingUrls[4]}" style="display: inline-block; padding: 10px 15px; font-size: 24px; text-decoration: none; color: #ffc107;">⭐⭐⭐⭐</a>
                          </td>
                          <td align="center" style="padding: 5px;">
                            <a href="${ratingUrls[5]}" style="display: inline-block; padding: 10px 15px; font-size: 24px; text-decoration: none; color: #ffc107;">⭐⭐⭐⭐⭐</a>
                          </td>
                        </tr>
                      </table>

                      <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 20px 0 0; text-align: center;">
                        This takes 10 seconds and helps us improve.
                      </p>

                      <p style="color: #666; font-size: 15px; line-height: 1.6; margin: 30px 0 0;">
                        Thank you!<br>
                        <strong style="color: #73160f;">The Hatche Team</strong>
                      </p>

                      <p style="color: #666; font-size: 14px; line-height: 1.6; margin: 20px 0 0; font-style: italic;">
                        P.S. Need help with something specific? Just reply - we're here for you.
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
      subject: 'Quick question about your experience',
      html: htmlContent,
      tags: [{ name: 'email-type', value: 'feedback-request' }],
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(400).json({ success: false, error: error.message });
    }

    console.log('✅ Feedback request email sent:', data);
    return res.status(200).json({ success: true, data });

  } catch (error) {
    console.error('❌ Error sending feedback email:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to send email'
    });
  }
};

