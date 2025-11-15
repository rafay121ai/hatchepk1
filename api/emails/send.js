// api/emails/send.js
// Unified email sending endpoint - combines all 6 email types into one function
// This reduces function count from 14 to 9 (under Vercel Hobby 12 limit)
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
    const { emailType, ...emailData } = req.body;

    // Validate required fields
    if (!emailType || !emailData.email) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: emailType and email'
      });
    }

    // Initialize Resend
    const resend = new Resend(process.env.RESEND_API_KEY);
    const fromEmail = process.env.FROM_EMAIL || 'hello@hatchepk.com';

    let htmlContent, subject;

    // Generate email content based on type
    switch (emailType) {
      case 'welcome':
        ({ htmlContent, subject } = generateWelcomeEmail(emailData));
        break;
      case 'order-confirmation':
        ({ htmlContent, subject } = generateOrderConfirmationEmail(emailData));
        break;
      case 'affiliate-welcome':
        ({ htmlContent, subject } = generateAffiliateWelcomeEmail(emailData));
        break;
      case 'post-guide-engagement':
        ({ htmlContent, subject } = generatePostGuideEmail(emailData));
        break;
      case 'feedback-request':
        ({ htmlContent, subject } = generateFeedbackRequestEmail(emailData));
        break;
      case 're-engagement':
        ({ htmlContent, subject } = generateReEngagementEmail(emailData));
        break;
      default:
        return res.status(400).json({
          success: false,
          error: `Unknown email type: ${emailType}`
        });
    }

    // Send email
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [emailData.email],
      subject: subject,
      html: htmlContent,
      tags: [{ name: 'email-type', value: emailType }],
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(400).json({ success: false, error: error.message });
    }

    console.log(`✅ ${emailType} email sent:`, data);
    return res.status(200).json({ success: true, data });

  } catch (error) {
    console.error('❌ Error sending email:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to send email'
    });
  }
};

// Import email templates from individual files
function generateWelcomeEmail({ firstName, topGuideUrl = 'https://hatchepk.com/our-guides', email }) {
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
                <tr>
                  <td style="background: linear-gradient(135deg, #73160f 0%, #8b1a13 100%); padding: 30px 20px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600; letter-spacing: 2px;">HATCHE</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 30px 20px;">
                    <h2 style="color: #2c2c2c; font-size: 22px; margin: 0 0 15px;">Welcome to Hatche! 🚀</h2>
                    <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                      Hi <strong style="color: #73160f;">${firstName}</strong>,
                    </p>
                    <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                      Welcome to our community of learners! We're excited to help you master your craft and build your influence, income, and identity.
                    </p>
                    <div style="background-color: #fdfcf1; border-radius: 12px; padding: 20px; margin: 20px 0;">
                      <h3 style="color: #73160f; font-size: 18px; margin: 0 0 15px;">Here's what you can expect:</h3>
                      <ul style="color: #666; font-size: 15px; line-height: 1.8; padding-left: 20px; margin: 0;">
                        <li>✓ Weekly expert guides delivered to your inbox</li>
                        <li>✓ Exclusive tips and resources</li>
                        <li>✓ Early access to new tutorials</li>
                      </ul>
                    </div>
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
  return { htmlContent, subject: 'Welcome to Hatche! Your first guide is here 🚀' };
}

function generateOrderConfirmationEmail({ customerName, guideTitle, orderAmount, orderId, email }) {
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
                <tr>
                  <td style="background: linear-gradient(135deg, #73160f 0%, #8b1a13 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 600; letter-spacing: 2px;">HATCHE</h1>
                    <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0; font-size: 14px;">Premium Guides for Creators</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="color: #2c2c2c; font-size: 24px; margin: 0 0 20px;">🎉 Thank You for Your Purchase!</h2>
                    <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                      Dear <strong style="color: #73160f;">${customerName}</strong>,
                    </p>
                    <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 30px;">
                      We're thrilled to have you join our community of creators! Your order has been confirmed, and you now have lifetime access to your guide. Get ready to build your influence, income, and identity with Hatche! ✨
                    </p>
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
                <tr>
                  <td style="background-color: #fdfcf1; padding: 30px; text-align: center; border-top: 3px solid #73160f;">
                    <p style="color: #666; font-size: 13px; margin: 0 0 10px;">
                      Need help? Contact us at <a href="mailto:hello@hatchepk.com" style="color: #73160f; text-decoration: none;">hello@hatchepk.com</a>
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
  return { htmlContent, subject: `🎉 Your Guide is Ready - Order #${(orderId || '').substring(0, 8)}` };
}

function generateAffiliateWelcomeEmail({ name, refId, commissionRate = 20, email }) {
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
                <tr>
                  <td style="background: linear-gradient(135deg, #73160f 0%, #8b1a13 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 600; letter-spacing: 2px;">HATCHE</h1>
                    <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0; font-size: 14px;">Affiliate Program</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px 30px;">
                    <h2 style="color: #2c2c2c; font-size: 24px; margin: 0 0 20px;">🎉 Welcome to the Hatche Family!</h2>
                    <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                      Dear <strong style="color: #73160f;">${name}</strong>,
                    </p>
                    <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                      Thank you for applying to become a Hatche Affiliate! We're excited to have passionate creators like you join our community. Your application has been successfully submitted and is now under review. 🌟
                    </p>
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
                    <p style="color: #666; font-size: 15px; line-height: 1.6; margin: 30px 0 0;">
                      We appreciate your interest in partnering with Hatche. Together, we'll empower Pakistani creators to build their dreams! 💪
                    </p>
                    <p style="color: #666; font-size: 15px; line-height: 1.6; margin: 20px 0 0;">
                      Warm regards,<br>
                      <strong style="color: #73160f;">The Hatche Team</strong>
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style="background-color: #fdfcf1; padding: 30px; text-align: center; border-top: 3px solid #73160f;">
                    <p style="color: #666; font-size: 13px; margin: 0 0 10px;">
                      Questions? Contact us at <a href="mailto:hello@hatchepk.com" style="color: #73160f; text-decoration: none; font-weight: 600;">hello@hatchepk.com</a>
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
  return { htmlContent, subject: '🎊 Welcome to Hatche Affiliate Program - Application Received' };
}

function generatePostGuideEmail({ firstName, guideTitle, guideId, email }) {
  const feedbackYesUrl = `https://hatchepk.com/api/feedback/record?guideId=${guideId}&email=${encodeURIComponent(email)}&rating=positive&source=post-guide-email`;
  const feedbackNoUrl = `https://hatchepk.com/api/feedback/record?guideId=${guideId}&email=${encodeURIComponent(email)}&rating=needs-improvement&source=post-guide-email`;
  
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
                <tr>
                  <td style="background: linear-gradient(135deg, #73160f 0%, #8b1a13 100%); padding: 30px 20px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">HATCHE</h1>
                  </td>
                </tr>
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
  return { htmlContent, subject: `Was our guide helpful, ${firstName}?` };
}

function generateFeedbackRequestEmail({ firstName, guideTitle, guideId, email }) {
  const baseUrl = `https://hatchepk.com/api/feedback/record?guideId=${guideId}&email=${encodeURIComponent(email)}&source=feedback-email`;
  const ratingUrls = {
    1: `${baseUrl}&rating=1`,
    2: `${baseUrl}&rating=2`,
    3: `${baseUrl}&rating=3`,
    4: `${baseUrl}&rating=4`,
    5: `${baseUrl}&rating=5`
  };
  
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
                <tr>
                  <td style="background: linear-gradient(135deg, #73160f 0%, #8b1a13 100%); padding: 30px 20px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">HATCHE</h1>
                  </td>
                </tr>
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
  return { htmlContent, subject: 'Quick question about your experience' };
}

function generateReEngagementEmail({ firstName, newGuides = [], email }) {
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
                <tr>
                  <td style="background: linear-gradient(135deg, #73160f 0%, #8b1a13 100%); padding: 30px 20px; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 600;">HATCHE</h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 30px 20px;">
                    <h2 style="color: #2c2c2c; font-size: 22px; margin: 0 0 15px;">Miss us? Here's what's new at Hatche</h2>
                    <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                      Hi <strong style="color: #73160f;">${firstName}</strong>,
                    </p>
                    <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                      It's been a week! We've been busy creating new guides you might love:
                    </p>
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fdfcf1; border-radius: 12px; margin: 20px 0; overflow: hidden;">
                      ${guidesList}
                    </table>
                    <p style="color: #666; font-size: 16px; line-height: 1.6; margin: 30px 0 20px;">
                      What would you like to learn next?
                    </p>
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
  return { htmlContent, subject: 'Miss us? Here\'s what\'s new at Hatche' };
}

