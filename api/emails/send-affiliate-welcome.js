// api/emails/send-affiliate-welcome.js
// Send affiliate welcome email via Resend
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
    const { name, email, refId, commissionRate = 20 } = req.body;

    // Validate required fields
    if (!email || !name || !refId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields'
      });
    }

    // Initialize Resend
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmail = process.env.FROM_EMAIL || 'hello@hatchepk.com';

    // Create beautiful HTML email
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Welcome to Hatche Affiliate Program</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Georgia', serif; background-color: #fdfcf1;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fdfcf1; padding: 40px 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(115, 22, 15, 0.1);">
                  
                  <!-- Header with brand color -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #73160f 0%, #8b1a13 100%); padding: 40px 30px; text-align: center;">
                      <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 600; letter-spacing: 2px;">HATCHE</h1>
                      <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0; font-size: 14px;">Affiliate Program</p>
                    </td>
                  </tr>

                  <!-- Main content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <h2 style="color: #2c2c2c; font-size: 24px; margin: 0 0 20px;">🎉 Welcome to the Hatche Family!</h2>
                      
                      <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                        Dear <strong style="color: #73160f;">${name}</strong>,
                      </p>

                      <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                        Thank you for applying to become a Hatche Affiliate! We're excited to have passionate creators like you join our community. Your application has been successfully submitted and is now under review. 🌟
                      </p>

                      <!-- Affiliate details box -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fdfcf1; border-radius: 12px; padding: 25px; margin: 0 0 30px;">
                        <tr>
                          <td>
                            <h3 style="color: #73160f; font-size: 18px; margin: 0 0 15px;">📊 Your Affiliate Details</h3>
                            
                            <p style="margin: 8px 0; color: #2c2c2c; font-size: 15px;">
                              <strong>Referral ID:</strong> <code style="background: #ffffff; padding: 4px 8px; border-radius: 4px; color: #73160f; font-weight: 600;">${refId}</code>
                            </p>
                            
                            <p style="margin: 8px 0; color: #2c2c2c; font-size: 15px;">
                              <strong>Commission Rate:</strong> ${commissionRate}% per sale
                            </p>
                          </td>
                        </tr>
                      </table>

                      <!-- Review notice -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 8px; padding: 20px; margin: 0 0 30px;">
                        <tr>
                          <td>
                            <p style="color: #856404; font-size: 15px; margin: 0; line-height: 1.6;">
                              ⏱️ <strong>Under Review:</strong> Your application will be reviewed within the next 48 hours. We'll notify you via email once it's approved!
                            </p>
                          </td>
                        </tr>
                      </table>

                      <!-- Next steps -->
                      <h3 style="color: #73160f; font-size: 18px; margin: 0 0 15px;">🚀 What Happens Next?</h3>
                      
                      <ol style="color: #666; font-size: 15px; line-height: 1.8; padding-left: 20px;">
                        <li><strong>Review Process:</strong> Our team will review your application within 48 hours</li>
                        <li><strong>Approval Email:</strong> You'll receive an approval email with your affiliate dashboard link</li>
                        <li><strong>Start Promoting:</strong> Share your unique referral link and start earning commissions</li>
                        <li><strong>Track Earnings:</strong> Monitor your conversions and payouts in your dashboard</li>
                      </ol>

                      <p style="color: #666; font-size: 15px; line-height: 1.6; margin: 30px 0 0;">
                        We appreciate your interest in partnering with Hatche. Together, we'll empower Pakistani creators to build their dreams! 💪
                      </p>

                      <p style="color: #666; font-size: 15px; line-height: 1.6; margin: 20px 0 0;">
                        Warm regards,<br>
                        <strong style="color: #73160f;">The Hatche Team</strong>
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #fdfcf1; padding: 30px; text-align: center; border-top: 3px solid #73160f;">
                      <p style="color: #666; font-size: 13px; margin: 0 0 10px;">
                        Questions? Contact us at <a href="mailto:hello@hatchepk.com" style="color: #73160f; text-decoration: none; font-weight: 600;">hello@hatchepk.com</a>
                      </p>
                      <p style="color: #999; font-size: 12px; margin: 0;">
                        Shaheed-e-millat rd, Roshan Tai Office Tower, 3rd floor, 309
                      </p>
                      <p style="color: #999; font-size: 12px; margin: 5px 0 0;">
                        <a href="tel:+923311041066" style="color: #73160f; text-decoration: none;">03311041066</a> | 
                        <a href="https://www.instagram.com/hatchepk/" style="color: #73160f; text-decoration: none;">Instagram</a>
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
      subject: '🎊 Welcome to Hatche Affiliate Program - Application Received',
      html: htmlContent,
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(400).json({ success: false, error: error.message });
    }

    console.log('✅ Affiliate welcome email sent:', data);
    return res.status(200).json({ success: true, data });

  } catch (error) {
    console.error('❌ Error sending email:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to send email'
    });
  }
};

