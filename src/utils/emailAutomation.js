// src/utils/emailAutomation.js
// Email automation triggers and scheduling

/**
 * Send welcome email immediately after signup
 */
export const sendWelcomeEmail = async (userData) => {
  try {
    const response = await fetch('/api/emails/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        emailType: 'welcome',
        firstName: userData.firstName || userData.name || 'Learner',
        email: userData.email,
        topGuideUrl: 'https://hatchepk.com/our-guides'
      }),
    });

    const result = await response.json();
    if (result.success) {
      console.log('✅ Welcome email sent');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return false;
  }
};

/**
 * Schedule post-guide engagement email (2 hours after guide view)
 */
export const schedulePostGuideEmail = async (userData, guideData) => {
  try {
    // Store in database for scheduled sending
    const { supabase } = await import('../supabaseClient');
    
    const { error } = await supabase
      .from('email_queue')
      .insert([{
        user_email: userData.email,
        user_id: userData.id,
        email_type: 'post-guide-engagement',
        scheduled_for: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours
        email_data: {
          firstName: userData.firstName || userData.name || 'Learner',
          guideTitle: guideData.title,
          guideId: guideData.id
        },
        status: 'pending'
      }]);

    if (error) {
      console.error('Error scheduling post-guide email:', error);
      return false;
    }

    console.log('✅ Post-guide email scheduled');
    return true;
  } catch (error) {
    console.error('Error scheduling post-guide email:', error);
    return false;
  }
};

/**
 * Schedule feedback request email (24 hours after interaction)
 */
export const scheduleFeedbackEmail = async (userData, guideData) => {
  try {
    const { supabase } = await import('../supabaseClient');
    
    const { error } = await supabase
      .from('email_queue')
      .insert([{
        user_email: userData.email,
        user_id: userData.id,
        email_type: 'feedback-request',
        scheduled_for: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        email_data: {
          firstName: userData.firstName || userData.name || 'Learner',
          guideTitle: guideData.title,
          guideId: guideData.id
        },
        status: 'pending'
      }]);

    if (error) {
      console.error('Error scheduling feedback email:', error);
      return false;
    }

    console.log('✅ Feedback email scheduled');
    return true;
  } catch (error) {
    console.error('Error scheduling feedback email:', error);
    return false;
  }
};

/**
 * Check and send re-engagement emails (7 days inactive)
 */
export const checkReEngagement = async (userEmail) => {
  try {
    const { supabase } = await import('../supabaseClient');
    
    // Check last activity
    const { data: user } = await supabase
      .from('users')
      .select('last_activity, email, name')
      .eq('email', userEmail)
      .maybeSingle();

    if (!user) return false;

    const lastActivity = user.last_activity ? new Date(user.last_activity) : null;
    const daysSinceActivity = lastActivity 
      ? Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    // If 7+ days inactive, schedule re-engagement
    if (daysSinceActivity >= 7) {
      const { data: newGuides } = await supabase
        .from('guides')
        .select('id, title, description')
        .order('created_at', { ascending: false })
        .limit(3);

      await supabase
        .from('email_queue')
        .insert([{
          user_email: userEmail,
          email_type: 're-engagement',
          scheduled_for: new Date().toISOString(),
          email_data: {
            firstName: user.name || 'Learner',
            newGuides: newGuides || []
          },
          status: 'pending'
        }]);

      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking re-engagement:', error);
    return false;
  }
};

