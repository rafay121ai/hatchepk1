-- Email Automation Database Schema
-- Run this SQL in your Supabase SQL editor

-- 1. Email Preferences Table
CREATE TABLE IF NOT EXISTS email_preferences (
  id BIGSERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  welcome_emails BOOLEAN DEFAULT true,
  post_guide_emails BOOLEAN DEFAULT true,
  feedback_emails BOOLEAN DEFAULT true,
  re_engagement_emails BOOLEAN DEFAULT true,
  marketing_emails BOOLEAN DEFAULT false,
  unsubscribed BOOLEAN DEFAULT false,
  unsubscribed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for email lookups
CREATE INDEX IF NOT EXISTS idx_email_preferences_email ON email_preferences(email);

-- 2. Email Queue Table
CREATE TABLE IF NOT EXISTS email_queue (
  id BIGSERIAL PRIMARY KEY,
  user_email VARCHAR(255) NOT NULL,
  user_id UUID,
  email_type VARCHAR(50) NOT NULL,
  scheduled_for TIMESTAMP NOT NULL,
  email_data JSONB,
  status VARCHAR(20) DEFAULT 'pending',
  sent_at TIMESTAMP,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for email queue
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_scheduled ON email_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_email_queue_email ON email_queue(user_email);

-- 3. User Feedback Table
CREATE TABLE IF NOT EXISTS user_feedback (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID,
  user_email VARCHAR(255) NOT NULL,
  guide_id UUID,
  rating INTEGER NOT NULL,
  feedback_text TEXT,
  source VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for feedback
CREATE INDEX IF NOT EXISTS idx_user_feedback_email ON user_feedback(user_email);
CREATE INDEX IF NOT EXISTS idx_user_feedback_guide ON user_feedback(guide_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_rating ON user_feedback(rating);

-- RLS Policies (if needed)
ALTER TABLE email_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- Users can view/update their own email preferences
CREATE POLICY "email_preferences_select_own"
ON email_preferences FOR SELECT
USING (auth.email() = email);

CREATE POLICY "email_preferences_update_own"
ON email_preferences FOR UPDATE
USING (auth.email() = email);

-- Service role can manage email queue
CREATE POLICY "email_queue_service_role"
ON email_queue FOR ALL
USING (auth.jwt()->>'role' = 'service_role');

-- Users can insert their own feedback
CREATE POLICY "user_feedback_insert_own"
ON user_feedback FOR INSERT
WITH CHECK (auth.email() = user_email);

CREATE POLICY "user_feedback_select_own"
ON user_feedback FOR SELECT
USING (auth.email() = user_email);

