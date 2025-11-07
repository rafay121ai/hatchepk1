-- =====================================================
-- INFLUENCER ACCESS SYSTEM - SUPABASE SCHEMA
-- =====================================================
-- Run this SQL in Supabase SQL Editor
-- =====================================================

-- 1. Access Codes Table
CREATE TABLE IF NOT EXISTS access_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(50) UNIQUE NOT NULL,
  influencer_name VARCHAR(100) NOT NULL,
  guide_id UUID NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
  guide_slug VARCHAR(100) NOT NULL,
  guide_title VARCHAR(255) NOT NULL,
  max_devices INTEGER DEFAULT 2 NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(255),
  notes TEXT,
  
  CONSTRAINT valid_max_devices CHECK (max_devices >= 1 AND max_devices <= 5)
);

-- 2. Access Code Sessions Table
CREATE TABLE IF NOT EXISTS access_code_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  access_code_id UUID NOT NULL REFERENCES access_codes(id) ON DELETE CASCADE,
  device_fingerprint VARCHAR(255) NOT NULL,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(access_code_id, device_fingerprint)
);

-- 3. Access Code Logs Table (Usage Tracking)
CREATE TABLE IF NOT EXISTS access_code_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  access_code_id UUID REFERENCES access_codes(id) ON DELETE SET NULL,
  action_type VARCHAR(50) NOT NULL, -- 'code_validated', 'access_denied', 'device_limit_reached', 'code_expired', 'guide_viewed'
  device_fingerprint VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_access_codes_code ON access_codes(code);
CREATE INDEX idx_access_codes_active ON access_codes(is_active, expires_at);
CREATE INDEX idx_sessions_token ON access_code_sessions(session_token);
CREATE INDEX idx_sessions_access_code ON access_code_sessions(access_code_id);
CREATE INDEX idx_logs_access_code ON access_code_logs(access_code_id);
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

INSERT INTO access_codes (
  code,
  influencer_name,
  guide_id,
  guide_slug,
  guide_title,
  max_devices,
  expires_at,
  created_by,
  notes
) VALUES (
  'FATIMA-CREATOR',                                    -- Code (similar to influencer name)
  'Fatima Ahmed',                                       -- Influencer name
  'your-guide-id-here',                                 -- Get from guides table
  'creator-gold-rush',                                  -- Guide slug
  'The Creator Gold Rush for Pakistani Women',          -- Guide title
  2,                                                    -- Max 2 devices
  NOW() + INTERVAL '5 days',                           -- Expires in 5 days
  'admin',                                              -- Who created it
  'Promotional code for Fatima Ahmed - Instagram influencer'
);

-- To get guide_id and guide_slug:
SELECT id, slug, title FROM guides;

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

