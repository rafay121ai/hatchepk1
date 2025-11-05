// api/emails/send-order-confirmation.js
// Send order confirmation email via Resend
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
    const { customerName, customerEmail, guideTitle, orderAmount, orderId } = req.body;

    // Validate required fields
    if (!customerEmail || !customerName || !guideTitle || !orderAmount || !orderId) {
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
          <title>Order Confirmation - Hatche</title>
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
                      <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0; font-size: 14px;">Premium Guides for Creators</p>
                    </td>
                  </tr>

                  <!-- Main content -->
                  <tr>
                    <td style="padding: 40px 30px;">
                      <h2 style="color: #2c2c2c; font-size: 24px; margin: 0 0 20px;">🎉 Thank You for Your Purchase!</h2>
                      
                      <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                        Dear <strong style="color: #73160f;">${customerName}</strong>,
                      </p>

                      <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                        We're thrilled to have you join our community of creators! Your order has been confirmed, and you now have lifetime access to your guide. Get ready to build your influence, income, and identity with Hatche! ✨
                      </p>

                      <!-- Order details box -->
                      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fdfcf1; border-radius: 12px; padding: 25px; margin: 0 0 30px;">
                        <tr>
                          <td>
                            <h3 style="color: #73160f; font-size: 18px; margin: 0 0 15px;">📦 Order Details</h3>
                            
                            <p style="margin: 8px 0; color: #2c2c2c; font-size: 15px;">
                              <strong>Guide:</strong> ${guideTitle}
                            </p>
                            
                            <p style="margin: 8px 0; color: #2c2c2c; font-size: 15px;">
                              <strong>Amount Paid:</strong> PKR ${orderAmount}
                            </p>
                            
                            <p style="margin: 8px 0; color: #666; font-size: 14px;">
                              <strong>Order ID:</strong> ${orderId}
                            </p>
                          </td>
                        </tr>
                      </table>

                      <!-- CTA Button -->
                      <table width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td align="center" style="padding: 20px 0;">
                            <a href="https://hatchepk.com/your-guides" style="display: inline-block; background: linear-gradient(135deg, #73160f 0%, #8b1a13 100%); color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 10px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(115, 22, 15, 0.3);">
                              Access Your Guide Now →
                            </a>
                          </td>
                        </tr>
                      </table>

                      <p style="color: #666; font-size: 15px; line-height: 1.6; margin: 30px 0 0;">
                        Thank you for choosing Hatche. We can't wait to see what you'll create!
                      </p>

                      <p style="color: #666; font-size: 15px; line-height: 1.6; margin: 10px 0 0;">
                        Warm regards,<br>
                        <strong style="color: #73160f;">The Hatche Team</strong>
                      </p>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #fdfcf1; padding: 30px; text-align: center; border-top: 3px solid #73160f;">
                      <p style="color: #666; font-size: 13px; margin: 0 0 10px;">
                        Need help? Contact us at <a href="mailto:hello@hatchepk.com" style="color: #73160f; text-decoration: none;">hello@hatchepk.com</a>
                      </p>
                      <p style="color: #999; font-size: 12px; margin: 0;">
                        Shaheed-e-millat rd, Roshan Tai Office Tower, 3rd floor, 309
                      </p>
                      <p style="color: #999; font-size: 12px; margin: 5px 0 0;">
                        <a href="https://www.instagram.com/hatchepk/" style="color: #73160f; text-decoration: none;">Follow us on Instagram</a>
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
      to: [customerEmail],
      subject: `🎉 Your Guide is Ready - Order #${orderId.substring(0, 8)}`,
      html: htmlContent,
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(400).json({ success: false, error: error.message });
    }

    console.log('✅ Order confirmation email sent:', data);
    return res.status(200).json({ success: true, data });

  } catch (error) {
    console.error('❌ Error sending email:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to send email'
    });
  }
};

