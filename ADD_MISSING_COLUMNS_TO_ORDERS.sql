-- =====================================================
-- ADD MISSING COLUMNS TO ORDERS TABLE
-- =====================================================
-- Run this in Supabase SQL Editor
-- =====================================================

-- Add basket_id column (for PayFast order tracking)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS basket_id TEXT;

-- Add transaction_id column (for PayFast transaction tracking)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS transaction_id TEXT;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_basket_id ON orders(basket_id);
CREATE INDEX IF NOT EXISTS idx_orders_transaction_id ON orders(transaction_id);

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'orders'
ORDER BY ordinal_position;

-- =====================================================
-- Your orders table now has all required columns!
-- =====================================================

