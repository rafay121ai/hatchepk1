-- =====================================================
-- MANUAL FIX FOR YOUR MISSING ORDER
-- Run this in Supabase SQL Editor
-- =====================================================

-- First, check if order exists
SELECT * FROM orders 
WHERE transaction_id = '0aa0c92d-ebf8-4629-4197-8ad8e3a481c1'
OR basket_id = 'ORDER-1762530879706-1LTAOJZA2';

-- If not found, create it manually:
INSERT INTO orders (
  customer_email,
  customer_name,
  product_name,
  amount,
  order_status,
  transaction_id,
  basket_id,
  created_at
) VALUES (
  'YOUR-EMAIL-HERE',                              -- Replace with your email
  'YOUR-NAME-HERE',                                -- Replace with your name
  'The Creator Gold Rush for Pakistani Women',     -- Guide title
  50,                                              -- Amount paid
  'completed',                                     -- Status
  '0aa0c92d-ebf8-4629-4197-8ad8e3a481c1',         -- Transaction ID from PayFast
  'ORDER-1762530879706-1LTAOJZA2',                -- Order ID
  '2024-11-07 20:55:23'                            -- Transaction time
);

-- Verify order was created
SELECT * FROM orders 
WHERE transaction_id = '0aa0c92d-ebf8-4629-4197-8ad8e3a481c1';

-- =====================================================
-- This will make the guide appear in "Your Guides"
-- =====================================================

