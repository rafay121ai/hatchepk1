-- ================================================================
-- FIX: Allow authenticated users to create orders
-- ================================================================
-- This fixes the 403 error when placing orders from the checkout page

-- Drop the restrictive service-only insert policy
DROP POLICY IF EXISTS "orders_insert_service" ON orders;

-- Create new policy: Authenticated users can insert their own orders
CREATE POLICY "orders_insert_authenticated"
ON orders FOR INSERT
WITH CHECK (
  -- User must be authenticated
  auth.uid() IS NOT NULL
  -- AND the email in the order matches their authenticated email
  AND auth.email() = customer_email
);

-- Also allow service role to insert (for backend operations like webhooks)
CREATE POLICY "orders_insert_service"
ON orders FOR INSERT
WITH CHECK (
  auth.jwt()->>'role' = 'service_role'
);

-- Update policy: Allow authenticated users to update their own orders
DROP POLICY IF EXISTS "orders_update_service" ON orders;

CREATE POLICY "orders_update_authenticated"
ON orders FOR UPDATE
USING (
  -- User must be authenticated
  auth.uid() IS NOT NULL
  -- AND the email in the order matches their authenticated email
  AND auth.email() = customer_email
);

-- Also allow service role to update (for backend operations like webhooks)
CREATE POLICY "orders_update_service"
ON orders FOR UPDATE
USING (
  auth.jwt()->>'role' = 'service_role'
);

-- ================================================================
-- DONE! Now authenticated users can:
-- 1. Create orders with their email
-- 2. Update their own orders
-- 3. View their own orders (policy already exists)
-- 
-- The service role (backend) can still do everything
-- ================================================================

