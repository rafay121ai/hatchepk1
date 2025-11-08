# 🔐 Environment Variables Checklist for Vercel

## ❌ **PROBLEM: 500/504 Timeout Error**

Your backend API can't find the PayFast credentials because they're not in Vercel.

---

## ✅ **SOLUTION: Add These 10 Variables to Vercel**

### **Required Variables:**

| Variable Name | Example Value | Where to Get It |
|---------------|---------------|-----------------|
| `MERCHANT_ID` | `242347` | PayFast Dashboard |
| `SECURED_KEY` | `4jSW7rfbd-m8VwB1_YKXXYwHGiHv` | PayFast Dashboard |
| `PAYFAST_TOKEN_URL` | `https://ipg1.apps.net.pk/Ecommerce/api/Transaction/GetAccessToken` | Fixed value |
| `PAYFAST_POST_URL` | `https://ipg1.apps.net.pk/Ecommerce/api/Transaction/PostTransaction` | Fixed value |
| `MERCHANT_CATEGORY_CODE` | `5816` | Fixed value |
| `CURRENCY_CODE` | `PKR` | Fixed value |
| `SUPABASE_URL` | `https://smlmbqgqkijodbxfpqen.supabase.co` | Supabase Dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGc...` | Supabase Dashboard → Settings → API |
| `RESEND_API_KEY` | `re_...` | Resend Dashboard |
| `FROM_EMAIL` | `hello@hatchepk.com` | Your verified email |

---

## 📋 **Step-by-Step: Add to Vercel**

### **Option 1: Vercel Dashboard (Easiest)**

1. **Go to**: https://vercel.com/dashboard
2. **Select** your project (hatchepk1 or rafay121ai/hatchepk1)
3. **Click** "Settings" tab
4. **Click** "Environment Variables" in sidebar
5. **For EACH variable**:
   - Click "Add New"
   - Enter Key (e.g., `MERCHANT_ID`)
   - Enter Value (e.g., `242347`)
   - Check ✓ Production, ✓ Preview, ✓ Development
   - Click "Save"
6. **After adding all 10 variables**:
   - Go to "Deployments" tab
   - Find latest deployment
   - Click "..." → "Redeploy"
   - Wait 2 minutes

---

### **Option 2: Vercel CLI (Faster)**

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Link to your project
cd /Users/rafayessani/hatchepk
vercel link

# Add each variable (repeat for all 10)
vercel env add MERCHANT_ID
# When prompted: 242347
# Select: Production, Preview, Development

vercel env add SECURED_KEY
# When prompted: 4jSW7rfbd-m8VwB1_YKXXYwHGiHv

vercel env add PAYFAST_TOKEN_URL
# When prompted: https://ipg1.apps.net.pk/Ecommerce/api/Transaction/GetAccessToken

vercel env add PAYFAST_POST_URL
# When prompted: https://ipg1.apps.net.pk/Ecommerce/api/Transaction/PostTransaction

vercel env add MERCHANT_CATEGORY_CODE
# When prompted: 5816

vercel env add CURRENCY_CODE
# When prompted: PKR

vercel env add SUPABASE_URL
# When prompted: https://smlmbqgqkijodbxfpqen.supabase.co

vercel env add SUPABASE_SERVICE_ROLE_KEY
# When prompted: your_service_role_key

vercel env add RESEND_API_KEY
# When prompted: your_resend_key

vercel env add FROM_EMAIL
# When prompted: hello@hatchepk.com

# Redeploy
vercel --prod
```

---

## 🔍 **Verify Environment Variables Are Set**

### **Check in Vercel Dashboard:**

1. Go to: Project → Settings → Environment Variables
2. You should see **10 variables** listed
3. Each should have values for: Production, Preview, Development

### **Check in Deployment Logs:**

After redeploying:
1. Go to: Deployments → Latest
2. Click on deployment
3. Click "Functions" tab
4. Find `/api/payment/get-token`
5. Look for this log:

```
✅ GOOD:
Environment check: {
  hasMerchantId: true,
  hasSecuredKey: true,
  hasTokenUrl: true,
  merchantId: "242347"
}

❌ BAD (Current):
Missing environment variables
```

---

## 🎯 **Why This Happens**

```
Local Development:
✅ Uses .env file (works fine)

Vercel Production:
❌ .env file NOT deployed (in .gitignore)
❌ Backend can't find credentials
❌ Returns 500 Internal Server Error
```

**Fix**: Add variables to Vercel Dashboard manually

---

## 🚨 **Common Mistakes**

1. ❌ Adding only to "Production" environment
   - **Fix**: Add to Production, Preview, AND Development

2. ❌ Typo in variable names
   - **Fix**: Copy-paste exactly: `MERCHANT_ID` not `MERCHANTID`

3. ❌ Not redeploying after adding variables
   - **Fix**: Always redeploy after changing env vars

4. ❌ Adding REACT_APP_ prefix to backend variables
   - **Fix**: Backend uses plain names (no prefix)

---

## ⏱️ **Quick Fix (5 Minutes)**

1. Open Vercel Dashboard
2. Project → Settings → Environment Variables
3. Add all 10 variables (copy from your PayFast email/dashboard)
4. Go to Deployments → Redeploy
5. Wait 2 minutes
6. Try payment again → Should work! ✅

---

## 📞 **Need Your PayFast Credentials?**

Check your email from PayFast with subject:
**"PayFast Merchant Account Credentials"**

It should contain:
- Merchant ID
- Secured Key
- Test/Production URLs

---

## 🎊 **After Fix**

Once variables are added and redeployed:

```
✅ /api/payment/get-token will respond in ~5-10 seconds
✅ No more 500/504 errors
✅ Payment flow will complete successfully
✅ Users will be redirected to PayFast payment page
```

---

**This is 100% the issue. Add the environment variables and it will work!** 🚀

