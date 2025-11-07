-- =====================================================
-- QUICK REFERENCE: Creating Influencer Access Codes
-- =====================================================
-- Copy and run this in Supabase SQL Editor
-- =====================================================

-- STEP 1: Get available guides (to get slug and title)
SELECT slug, title FROM guides;

-- STEP 2: Create access code
-- Replace values below with actual data:

INSERT INTO access_codes (
  code,              -- LOWERCASE, similar to influencer name (e.g., 'fatima-creator')
  influencer_name,   -- Full name (e.g., 'Fatima Ahmed')
  guide_slug,        -- From guides table (e.g., 'creator-gold-rush')
  guide_title,       -- From guides table
  max_devices,       -- 2 is default, can be 1-5
  expires_at         -- Optional: defaults to NOW() + 5 days if not specified
) VALUES (
  'fatima-creator',                                  -- Code (MUST be lowercase)
  'Fatima Ahmed',                                    -- Influencer name
  'creator-gold-rush',                               -- Guide slug
  'The Creator Gold Rush for Pakistani Women',       -- Guide title
  2,                                                 -- Max 2 devices
  NOW() + INTERVAL '5 days'                         -- Expires in 5 days
);

-- =====================================================
-- QUICK EXAMPLES
-- =====================================================

-- Example 1: Code for Ayesha (Tech Guide, 3 devices, 7 days)
INSERT INTO access_codes (code, influencer_name, guide_slug, guide_title, max_devices, expires_at)
VALUES ('ayesha-tech', 'Ayesha Khan', 'tech-guide-slug', 'Tech Guide Title', 3, NOW() + INTERVAL '7 days');

-- Example 2: Code for Hassan (Business Guide, default 2 devices, default 5 days)
INSERT INTO access_codes (code, influencer_name, guide_slug, guide_title)
VALUES ('hassan-business', 'Hassan Ali', 'business-guide-slug', 'Business Guide Title');

-- Example 3: Code for Review (1 device only, 3 days)
INSERT INTO access_codes (code, influencer_name, guide_slug, guide_title, max_devices, expires_at)
VALUES ('zainab-review', 'Zainab Review', 'guide-slug', 'Guide Title', 1, NOW() + INTERVAL '3 days');

-- =====================================================
-- MANAGEMENT QUERIES
-- =====================================================

-- View all active codes
SELECT 
  code,
  influencer_name,
  guide_title,
  max_devices,
  expires_at,
  is_active,
  created_at
FROM access_codes
WHERE is_active = true
ORDER BY created_at DESC;

-- View code usage (how many devices)
SELECT 
  ac.code,
  ac.influencer_name,
  COUNT(DISTINCT acs.device_fingerprint) as active_devices,
  ac.max_devices,
  ac.expires_at
FROM access_codes ac
LEFT JOIN access_code_sessions acs ON ac.id = acs.access_code_id
GROUP BY ac.id
ORDER BY ac.created_at DESC;

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
UPDATE access_codes 
SET is_active = false 
WHERE code = 'fatima-creator';

-- Extend expiry by 5 more days
UPDATE access_codes 
SET expires_at = NOW() + INTERVAL '5 days'
WHERE code = 'fatima-creator';

-- Remove all sessions for a code (force re-auth)
DELETE FROM access_code_sessions
WHERE access_code_id = (SELECT id FROM access_codes WHERE code = 'fatima-creator');

-- Clean up expired codes
UPDATE access_codes 
SET is_active = false
WHERE expires_at < NOW() AND is_active = true;

