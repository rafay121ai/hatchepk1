-- =====================================================
-- INFLUENCER ACCESS SYSTEM - SUPABASE SCHEMA
-- =====================================================
-- Run this SQL in Supabase SQL Editor
-- =====================================================

-- 1. Access Codes Table
CREATE TABLE IF NOT EXISTS access_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  influencer_name TEXT NOT NULL,
  guide_slug TEXT NOT NULL,
  guide_title TEXT NOT NULL,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '5 days'),
  is_active BOOLEAN DEFAULT true,
  max_devices INTEGER DEFAULT 2,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure code is always lowercase
  CONSTRAINT code_lowercase CHECK (code = LOWER(code))
);

-- 2. Access Code Sessions Table
CREATE TABLE IF NOT EXISTS access_code_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  access_code_id UUID REFERENCES access_codes(id) ON DELETE CASCADE,
  device_fingerprint TEXT NOT NULL,
  session_token TEXT UNIQUE NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate devices
  UNIQUE(access_code_id, device_fingerprint)
);

-- 3. Access Code Event Logs Table
CREATE TABLE IF NOT EXISTS access_code_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  access_code_id UUID REFERENCES access_codes(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'code_validated', 'guide_viewed', 'access_denied', 'device_limit_reached'
  device_fingerprint TEXT,
  ip_address TEXT,
  user_agent TEXT,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_access_codes_code ON access_codes(code);
CREATE INDEX idx_access_codes_expires ON access_codes(expires_at);
CREATE INDEX idx_sessions_token ON access_code_sessions(session_token);
CREATE INDEX idx_sessions_code_id ON access_code_sessions(access_code_id);
CREATE INDEX idx_logs_code_id ON access_code_logs(access_code_id);
CREATE INDEX idx_logs_created_at ON access_code_logs(created_at DESC);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE access_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_code_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_code_logs ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role has full access to access_codes"
  ON access_codes FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to access_code_sessions"
  ON access_code_sessions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role has full access to access_code_logs"
  ON access_code_logs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void AS $$
BEGIN
  DELETE FROM access_code_sessions
  WHERE access_code_id IN (
    SELECT id FROM access_codes
    WHERE expires_at < NOW() OR is_active = FALSE
  );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- EXAMPLE: HOW TO CREATE AN INFLUENCER CODE
-- =====================================================

/*
-- Replace these values with actual data:

-- First, get guide details
SELECT slug, title FROM guides;

-- Then create access code
INSERT INTO access_codes (
  code,
  influencer_name,
  guide_slug,
  guide_title,
  max_devices,
  expires_at
) VALUES (
  'fatima-creator',                                     -- Code (lowercase, similar to influencer name)
  'Fatima Ahmed',                                        -- Influencer name
  'creator-gold-rush',                                   -- Guide slug from guides table
  'The Creator Gold Rush for Pakistani Women',           -- Guide title
  2,                                                     -- Max 2 devices
  NOW() + INTERVAL '5 days'                             -- Expires in 5 days
);

-- To view all active codes:
SELECT 
  code,
  influencer_name,
  guide_title,
  max_devices,
  expires_at,
  is_active,
  created_at
FROM access_codes
WHERE is_active = TRUE
ORDER BY created_at DESC;

-- To view code usage:
SELECT 
  ac.code,
  ac.influencer_name,
  COUNT(DISTINCT acs.device_fingerprint) as active_devices,
  ac.max_devices,
  ac.expires_at,
  CASE 
    WHEN ac.expires_at < NOW() THEN 'EXPIRED'
    WHEN NOT ac.is_active THEN 'INACTIVE'
    ELSE 'ACTIVE'
  END as status
FROM access_codes ac
LEFT JOIN access_code_sessions acs ON ac.id = acs.access_code_id
GROUP BY ac.id
ORDER BY ac.created_at DESC;

-- To view access logs:
SELECT 
  ac.code,
  ac.influencer_name,
  acl.action_type,
  acl.ip_address,
  acl.error_message,
  acl.created_at
FROM access_code_logs acl
LEFT JOIN access_codes ac ON acl.access_code_id = ac.id
ORDER BY acl.created_at DESC
LIMIT 50;

-- To deactivate a code:
UPDATE access_codes 
SET is_active = FALSE 
WHERE code = 'FATIMA-CREATOR';

-- To extend expiry:
UPDATE access_codes 
SET expires_at = NOW() + INTERVAL '5 days'
WHERE code = 'FATIMA-CREATOR';
*/

