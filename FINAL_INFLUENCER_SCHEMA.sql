-- =====================================================
-- FINAL INFLUENCER ACCESS SCHEMA
-- Uses guide_id foreign key to reference guides table
-- No duplicate data - title fetched from guides table
-- =====================================================
-- Run this SQL in Supabase SQL Editor
-- =====================================================

-- 1. Access Codes Table (with foreign key to guides)
CREATE TABLE IF NOT EXISTS access_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  influencer_name TEXT NOT NULL,
  guide_id UUID NOT NULL REFERENCES guides(id) ON DELETE CASCADE,  -- Foreign key!
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
CREATE INDEX idx_access_codes_guide_id ON access_codes(guide_id);
CREATE INDEX idx_access_codes_expires ON access_codes(expires_at);
CREATE INDEX idx_sessions_token ON access_code_sessions(session_token);
CREATE INDEX idx_sessions_code_id ON access_code_sessions(access_code_id);
CREATE INDEX idx_logs_code_id ON access_code_logs(access_code_id);
CREATE INDEX idx_logs_created_at ON access_code_logs(created_at DESC);

-- =====================================================
-- EXAMPLE: HOW TO CREATE AN INFLUENCER CODE
-- =====================================================

-- STEP 1: Get available guides (to get guide_id, title, and slug)
SELECT id, title, slug FROM guides;

-- STEP 2: Create access code (only need guide_id - title comes from guides table!)
INSERT INTO access_codes (code, influencer_name, guide_id)
VALUES (
  'fatima-creator',                          -- Code (lowercase)
  'Fatima Ahmed',                            -- Influencer name
  'PASTE-GUIDE-UUID-FROM-STEP-1-HERE'       -- Guide ID (UUID)
);

-- =====================================================
-- VIEWING CODES WITH GUIDE DETAILS
-- =====================================================

-- View all codes with guide information (joined)
SELECT 
  ac.code,
  ac.influencer_name,
  g.title as guide_title,
  g.slug as guide_slug,
  ac.expires_at,
  ac.max_devices,
  ac.is_active
FROM access_codes ac
JOIN guides g ON ac.guide_id = g.id
WHERE ac.is_active = true
ORDER BY ac.created_at DESC;

-- View code usage with guide info
SELECT 
  ac.code,
  ac.influencer_name,
  g.title as guide_title,
  COUNT(DISTINCT acs.device_fingerprint) as active_devices,
  ac.max_devices
FROM access_codes ac
JOIN guides g ON ac.guide_id = g.id
LEFT JOIN access_code_sessions acs ON ac.id = acs.access_code_id
GROUP BY ac.id, g.id
ORDER BY ac.created_at DESC;

-- =====================================================
-- MORE EXAMPLES
-- =====================================================

-- Example 1: Custom expiry and device limit
INSERT INTO access_codes (code, influencer_name, guide_id, max_devices, expires_at)
VALUES ('ayesha-tech', 'Ayesha Khan', 'GUIDE-UUID-HERE', 3, NOW() + INTERVAL '7 days');

-- Example 2: Default settings (2 devices, 5 days)
INSERT INTO access_codes (code, influencer_name, guide_id)
VALUES ('hassan-business', 'Hassan Ali', 'GUIDE-UUID-HERE');

-- =====================================================
-- MANAGEMENT QUERIES
-- =====================================================

-- View all active codes with guide details
SELECT 
  ac.code,
  ac.influencer_name,
  g.title,
  g.slug,
  ac.expires_at,
  ac.is_active
FROM access_codes ac
JOIN guides g ON ac.guide_id = g.id
WHERE ac.is_active = true;

-- View recent access logs with guide info
SELECT 
  ac.code,
  ac.influencer_name,
  g.title as guide_title,
  acl.action_type,
  acl.ip_address,
  acl.created_at
FROM access_code_logs acl
LEFT JOIN access_codes ac ON acl.access_code_id = ac.id
LEFT JOIN guides g ON ac.guide_id = g.id
ORDER BY acl.created_at DESC
LIMIT 20;

-- Deactivate a code
UPDATE access_codes SET is_active = false WHERE code = 'fatima-creator';

-- Extend expiry
UPDATE access_codes SET expires_at = NOW() + INTERVAL '5 days' WHERE code = 'fatima-creator';

-- =====================================================
-- DONE! Clean schema with no duplicate data
-- =====================================================

