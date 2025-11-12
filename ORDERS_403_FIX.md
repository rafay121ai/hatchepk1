# 🔧 Fix: 403 Error When Creating Orders

## ❌ **The Problem**

When trying to place an order, you're getting:
```
403 Forbidden
❌ Error creating pending order
Failed to create order. Please try again.
```

---

## 🔍 **Root Cause**

The RLS (Row Level Security) policy on the `orders` table only allows the **service role** to insert orders:

```sql
-- Current policy (TOO RESTRICTIVE)
CREATE POLICY "orders_insert_service"
ON orders FOR INSERT
WITH CHECK (
  auth.jwt()->>'role' = 'service_role'
);
```

But your **frontend code** (`checkout.js`) is using the **anon key** (regular authenticated user), not the service role. This causes the 403 error.

---

## ✅ **The Solution**

You need to update the RLS policies to allow **authenticated users** to create and update their own orders.

### **Step 1: Go to Supabase SQL Editor**

1. Open your Supabase Dashboard
2. Navigate to **SQL Editor** (left sidebar)
3. Click **"New Query"**

### **Step 2: Run This SQL**

Copy and paste the contents of `FIX_ORDERS_RLS.sql` into the SQL editor and click **"Run"**.

Or copy this:

```sql
-- Drop the restrictive service-only insert policy
DROP POLICY IF EXISTS "orders_insert_service" ON orders;

-- Create new policy: Authenticated users can insert their own orders
CREATE POLICY "orders_insert_authenticated"
ON orders FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND auth.email() = customer_email
);

-- Also allow service role to insert (for backend operations)
CREATE POLICY "orders_insert_service"
ON orders FOR INSERT
WITH CHECK (
  auth.jwt()->>'role' = 'service_role'
);

-- Drop the restrictive service-only update policy
DROP POLICY IF EXISTS "orders_update_service" ON orders;

-- Create new policy: Authenticated users can update their own orders
CREATE POLICY "orders_update_authenticated"
ON orders FOR UPDATE
USING (
  auth.uid() IS NOT NULL
  AND auth.email() = customer_email
);

-- Also allow service role to update (for backend operations)
CREATE POLICY "orders_update_service"
ON orders FOR UPDATE
USING (
  auth.jwt()->>'role' = 'service_role'
);
```

---

## 🎯 **What This Does**

### **Before (Broken)**:
```
❌ Only service role can insert orders
❌ Only service role can update orders
✅ Users can view their own orders
```

### **After (Fixed)**:
```
✅ Authenticated users can insert orders with their email
✅ Authenticated users can update their own orders
✅ Users can view their own orders
✅ Service role (backend) can still do everything
```

---

## 🧪 **How to Test**

1. **Run the SQL** in Supabase
2. **Go to your website** → `/checkout`
3. **Select a guide** and fill in the checkout form
4. **Click "Complete Purchase"**
5. **Expected**: Order should be created successfully (no 403 error)

---

## 🔒 **Security Notes**

This is **secure** because:
- ✅ Users can only create orders with **their own email** (`auth.email() = customer_email`)
- ✅ Users can only update **their own orders** (same email check)
- ✅ Users can only view **their own orders** (existing policy)
- ✅ Service role (backend/webhooks) can still do everything

---

## 📊 **Updated RLS Policies Summary**

| Table | Action | Who Can Do It |
|-------|--------|---------------|
| `orders` | SELECT | User (own orders) ✅ |
| `orders` | INSERT | User (own email) ✅ + Service Role ✅ |
| `orders` | UPDATE | User (own orders) ✅ + Service Role ✅ |
| `orders` | DELETE | Service Role only ✅ |

---

## ⚠️ **If Still Not Working**

1. **Check if user is logged in**: The user must be authenticated
2. **Check email match**: The `customer_email` in the order must match `auth.email()`
3. **Refresh the page**: Clear browser cache
4. **Check Supabase logs**: SQL Editor → Query History

---

## 🚀 **After Running SQL**

```
✅ RLS policies updated
✅ Users can create orders
✅ Orders page will work
✅ Checkout will work
```

**Run the SQL now and test your checkout!** 🎉

