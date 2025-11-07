-- =====================================================
-- SIMPLIFIED INFLUENCER ACCESS SCHEMA
-- Uses guide_title instead of guide_slug
-- =====================================================
-- Run this SQL in Supabase SQL Editor
-- =====================================================

-- 1. Access Codes Table
CREATE TABLE IF NOT EXISTS access_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  influencer_name TEXT NOT NULL,
  guide_title TEXT NOT NULL,                         -- Match by title (no slug needed!)
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
  action_type TEXT NOT NULL,
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
-- EXAMPLE: HOW TO CREATE AN INFLUENCER CODE
-- =====================================================

-- STEP 1: Get available guides
SELECT id, title FROM guides;

-- STEP 2: Create access code (copy exact title from above)
INSERT INTO access_codes (code, influencer_name, guide_title)
VALUES (
  'fatima-creator',                                   -- Code (lowercase)
  'Fatima Ahmed',                                      -- Influencer name
  'The Creator Gold Rush for Pakistani Women'          -- EXACT title from guides table
);

-- =====================================================
-- MORE EXAMPLES
-- =====================================================

-- Example 1: Custom expiry and device limit
INSERT INTO access_codes (code, influencer_name, guide_title, max_devices, expires_at)
VALUES ('ayesha-tech', 'Ayesha Khan', 'Your Guide Title Here', 3, NOW() + INTERVAL '7 days');

-- Example 2: Default settings (2 devices, 5 days)
INSERT INTO access_codes (code, influencer_name, guide_title)
VALUES ('hassan-business', 'Hassan Ali', 'Your Guide Title Here');

-- =====================================================
-- MANAGEMENT QUERIES
-- =====================================================

-- View all active codes
SELECT code, influencer_name, guide_title, expires_at, max_devices, is_active
FROM access_codes
WHERE is_active = true
ORDER BY created_at DESC;

-- View code usage
SELECT 
  ac.code,
  ac.influencer_name,
  COUNT(DISTINCT acs.device_fingerprint) as active_devices,
  ac.max_devices
FROM access_codes ac
LEFT JOIN access_code_sessions acs ON ac.id = acs.access_code_id
GROUP BY ac.id;

-- View recent access logs
SELECT 
  ac.code,
  ac.influencer_name,
  acl.action_type,
  acl.ip_address,
  acl.created_at
FROM access_code_logs acl
LEFT JOIN access_codes ac ON acl.access_code_id = ac.id
ORDER BY acl.created_at DESC
LIMIT 20;

-- Deactivate a code
UPDATE access_codes SET is_active = false WHERE code = 'fatima-creator';

-- Extend expiry
UPDATE access_codes SET expires_at = NOW() + INTERVAL '5 days' WHERE code = 'fatima-creator';

-- =====================================================
-- DONE! Your influencer system is ready to use
-- =====================================================

