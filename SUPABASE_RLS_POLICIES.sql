-- ================================================================
-- SUPABASE ROW LEVEL SECURITY (RLS) POLICIES
-- Hatche Website - Complete Security Setup
-- ================================================================

-- IMPORTANT: Run these SQL commands in your Supabase SQL Editor
-- Navigate to: Supabase Dashboard → SQL Editor → New Query

-- ================================================================
-- 1. GUIDES TABLE
-- ================================================================

-- Enable RLS
ALTER TABLE guides ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view all guides (public catalog)
CREATE POLICY "guides_select_public"
ON guides FOR SELECT
USING (true);

-- Policy: Only service role can insert/update/delete guides (admin only)
-- (No policy needed - service role bypasses RLS)

-- ================================================================
-- 2. ORDERS TABLE
-- ================================================================

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own orders
CREATE POLICY "orders_select_own"
ON orders FOR SELECT
USING (
  auth.email() = customer_email
);

-- Policy: Service role can insert orders (backend API only)
CREATE POLICY "orders_insert_service"
ON orders FOR INSERT
WITH CHECK (
  auth.jwt()->>'role' = 'service_role'
);

-- Policy: Service role can update orders (backend API only)
CREATE POLICY "orders_update_service"
ON orders FOR UPDATE
USING (
  auth.jwt()->>'role' = 'service_role'
);

-- ================================================================
-- 3. PURCHASES TABLE
-- ================================================================

-- Enable RLS
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own purchases
CREATE POLICY "purchases_select_own"
ON purchases FOR SELECT
USING (
  auth.uid() = user_id
);

-- Policy: Service role can insert purchases
CREATE POLICY "purchases_insert_service"
ON purchases FOR INSERT
WITH CHECK (
  auth.jwt()->>'role' = 'service_role'
);

-- Policy: Service role can update purchases
CREATE POLICY "purchases_update_service"
ON purchases FOR UPDATE
USING (
  auth.jwt()->>'role' = 'service_role'
);

-- ================================================================
-- 4. ACTIVE_SESSIONS TABLE (Device Tracking)
-- ================================================================

-- Enable RLS
ALTER TABLE active_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own sessions
CREATE POLICY "active_sessions_select_own"
ON active_sessions FOR SELECT
USING (
  auth.uid() = user_id
);

-- Policy: Users can insert their own sessions
CREATE POLICY "active_sessions_insert_own"
ON active_sessions FOR INSERT
WITH CHECK (
  auth.uid() = user_id
);

-- Policy: Users can update their own sessions
CREATE POLICY "active_sessions_update_own"
ON active_sessions FOR UPDATE
USING (
  auth.uid() = user_id
);

-- Policy: Users can delete their own sessions
CREATE POLICY "active_sessions_delete_own"
ON active_sessions FOR DELETE
USING (
  auth.uid() = user_id
);

-- ================================================================
-- 5. ACCESS_CODES TABLE (Influencer Access)
-- ================================================================

-- Enable RLS
ALTER TABLE access_codes ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can manage access codes (backend API only)
CREATE POLICY "access_codes_service_all"
ON access_codes FOR ALL
USING (
  auth.jwt()->>'role' = 'service_role'
);

-- ================================================================
-- 6. ACCESS_CODE_SESSIONS TABLE (Influencer Sessions)
-- ================================================================

-- Enable RLS
ALTER TABLE access_code_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can manage sessions (backend API only)
CREATE POLICY "access_code_sessions_service_all"
ON access_code_sessions FOR ALL
USING (
  auth.jwt()->>'role' = 'service_role'
);

-- ================================================================
-- 7. ACCESS_CODE_LOGS TABLE (Influencer Logs)
-- ================================================================

-- Enable RLS
ALTER TABLE access_code_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Service role can insert logs (backend API only)
CREATE POLICY "access_code_logs_insert_service"
ON access_code_logs FOR INSERT
WITH CHECK (
  auth.jwt()->>'role' = 'service_role'
);

-- Policy: Admins can view logs (optional - if you want to view them)
CREATE POLICY "access_code_logs_select_service"
ON access_code_logs FOR SELECT
USING (
  auth.jwt()->>'role' = 'service_role'
);

-- ================================================================
-- 8. AFFILIATES TABLE
-- ================================================================

-- Enable RLS
ALTER TABLE affiliates ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own affiliate record
CREATE POLICY "affiliates_select_own"
ON affiliates FOR SELECT
USING (
  auth.email() = email
);

-- Policy: Users can insert their own affiliate application
CREATE POLICY "affiliates_insert_own"
ON affiliates FOR INSERT
WITH CHECK (
  auth.email() = email
);

-- Policy: Service role can update affiliate records (for approval)
CREATE POLICY "affiliates_update_service"
ON affiliates FOR UPDATE
USING (
  auth.jwt()->>'role' = 'service_role'
);

-- ================================================================
-- 9. CONVERSIONS TABLE (Affiliate Tracking)
-- ================================================================

-- Enable RLS
ALTER TABLE conversions ENABLE ROW LEVEL SECURITY;

-- Policy: Affiliates can view their own conversions
CREATE POLICY "conversions_select_own"
ON conversions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM affiliates
    WHERE affiliates.ref_id = conversions.affiliate_ref_id
    AND affiliates.email = auth.email()
  )
);

-- Policy: Service role can insert conversions (backend only)
CREATE POLICY "conversions_insert_service"
ON conversions FOR INSERT
WITH CHECK (
  auth.jwt()->>'role' = 'service_role'
);

-- Policy: Service role can update conversions
CREATE POLICY "conversions_update_service"
ON conversions FOR UPDATE
USING (
  auth.jwt()->>'role' = 'service_role'
);

-- ================================================================
-- 10. PAYOUTS TABLE (Affiliate Payments)
-- ================================================================

-- Enable RLS
ALTER TABLE payouts ENABLE ROW LEVEL SECURITY;

-- Policy: Affiliates can view their own payouts
CREATE POLICY "payouts_select_own"
ON payouts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM affiliates
    WHERE affiliates.ref_id = payouts.affiliate_ref_id
    AND affiliates.email = auth.email()
  )
);

-- Policy: Service role can insert payouts (admin only)
CREATE POLICY "payouts_insert_service"
ON payouts FOR INSERT
WITH CHECK (
  auth.jwt()->>'role' = 'service_role'
);

-- Policy: Service role can update payouts
CREATE POLICY "payouts_update_service"
ON payouts FOR UPDATE
USING (
  auth.jwt()->>'role' = 'service_role'
);

-- ================================================================
-- VERIFICATION QUERIES
-- ================================================================

-- Run these queries to verify RLS is enabled on all tables:

SELECT 
  schemaname,
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'guides', 'orders', 'purchases', 'active_sessions',
  'access_codes', 'access_code_sessions', 'access_code_logs',
  'affiliates', 'conversions', 'payouts'
)
ORDER BY tablename;

-- View all policies:
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ================================================================
-- NOTES
-- ================================================================

/*
SECURITY SUMMARY:

1. **Guides**: Public read, admin write (via service role)
2. **Orders**: Users see their own, backend creates/updates
3. **Purchases**: Users see their own, backend creates/updates
4. **Active Sessions**: Users manage their own sessions
5. **Access Codes**: Backend only (influencer system)
6. **Access Code Sessions**: Backend only (influencer system)
7. **Access Code Logs**: Backend only (influencer system)
8. **Affiliates**: Users see/create their own, backend approves
9. **Conversions**: Affiliates see their own, backend creates
10. **Payouts**: Affiliates see their own, backend creates

KEY PRINCIPLES:
- Users can only access their own data
- Backend APIs use service role to bypass RLS when needed
- Sensitive operations (orders, payments) are backend-only
- Public data (guides) is readable by everyone

TESTING:
After applying these policies, test with:
1. Logged-in user trying to view their orders ✅
2. Logged-in user trying to view another user's orders ❌
3. Anonymous user trying to view guides ✅
4. Anonymous user trying to view orders ❌
*/

