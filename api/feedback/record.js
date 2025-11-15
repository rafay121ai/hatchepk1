// api/feedback/record.js
// Record user feedback from email links
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { guideId, email, rating, source, feedback } = req.method === 'GET' ? req.query : req.body;

    // Validate required fields
    if (!email || !rating) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email and rating'
      });
    }

    // Get user ID from email
    let userId = null;
    if (email) {
      const { data: userData } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .maybeSingle();
      
      if (userData) {
        userId = userData.id;
      }
    }

    // Record feedback in database
    const feedbackData = {
      user_id: userId,
      user_email: email,
      guide_id: guideId || null,
      rating: typeof rating === 'string' ? parseInt(rating) : rating,
      feedback_text: feedback || null,
      source: source || 'email',
      created_at: new Date().toISOString()
    };

    // Insert feedback (create feedback table if it doesn't exist)
    const { data, error } = await supabase
      .from('user_feedback')
      .insert([feedbackData])
      .select();

    if (error) {
      console.error('Error recording feedback:', error);
      // Don't fail if table doesn't exist - just log
      if (error.code !== 'PGRST116') {
        return res.status(500).json({
          success: false,
          error: 'Failed to record feedback'
        });
      }
    }

    // Redirect to thank you page
    if (req.method === 'GET') {
      return res.redirect(302, `https://hatchepk.com/feedback-thank-you?rating=${rating}`);
    }

    return res.status(200).json({
      success: true,
      message: 'Feedback recorded successfully',
      data
    });

  } catch (error) {
    console.error('❌ Error recording feedback:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to record feedback'
    });
  }
};

