-- =====================================================
-- COMPLETE INFLUENCER ACCESS SYSTEM SCHEMA
-- =====================================================
-- Copy and run this entire file in Supabase SQL Editor
-- =====================================================

-- 1. ACCESS CODES TABLE
-- Stores influencer access codes with reference to guides
CREATE TABLE IF NOT EXISTS access_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  influencer_name TEXT NOT NULL,
  guide_id UUID NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '5 days'),
  is_active BOOLEAN DEFAULT true,
  max_devices INTEGER DEFAULT 2,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure code is always lowercase
  CONSTRAINT code_lowercase CHECK (code = LOWER(code)),
  -- Ensure max_devices is between 1 and 5
  CONSTRAINT valid_max_devices CHECK (max_devices >= 1 AND max_devices <= 5)
);

-- 2. ACCESS CODE SESSIONS TABLE
-- Tracks active device sessions for each code
CREATE TABLE IF NOT EXISTS access_code_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  access_code_id UUID NOT NULL REFERENCES access_codes(id) ON DELETE CASCADE,
  device_fingerprint TEXT NOT NULL,
  session_token TEXT UNIQUE NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  last_accessed_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One session per device per code
  UNIQUE(access_code_id, device_fingerprint)
);

-- 3. ACCESS CODE LOGS TABLE
-- Logs all access attempts for monitoring
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

-- Access codes indexes
CREATE INDEX IF NOT EXISTS idx_access_codes_code ON access_codes(code);
CREATE INDEX IF NOT EXISTS idx_access_codes_guide_id ON access_codes(guide_id);
CREATE INDEX IF NOT EXISTS idx_access_codes_expires ON access_codes(expires_at);
CREATE INDEX IF NOT EXISTS idx_access_codes_active ON access_codes(is_active);

-- Sessions indexes
CREATE INDEX IF NOT EXISTS idx_sessions_token ON access_code_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_code_id ON access_code_sessions(access_code_id);
CREATE INDEX IF NOT EXISTS idx_sessions_fingerprint ON access_code_sessions(device_fingerprint);

-- Logs indexes
CREATE INDEX IF NOT EXISTS idx_logs_code_id ON access_code_logs(access_code_id);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON access_code_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logs_action_type ON access_code_logs(action_type);

-- =====================================================
-- VERIFY TABLES CREATED
-- =====================================================

-- Run this to verify all 3 tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE 'access_%'
ORDER BY table_name;

-- Should return:
-- access_code_logs
-- access_code_sessions
-- access_codes

-- =====================================================
-- DONE! Tables created successfully
-- =====================================================

