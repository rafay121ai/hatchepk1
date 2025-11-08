# 🔧 PayFast 504/500 Error Fix

## 🎯 **Root Cause Analysis**

The 500/504 error is caused by **Issue #4: Missing Environment Variables in Vercel**

### **Why This Happens:**

Your `.env` file exists locally (on your computer) but is NOT deployed to Vercel. When Vercel runs your backend API, it can't find the PayFast credentials.

---

## ✅ **Solution: Add Environment Variables to Vercel**

### **Step 1: Get Your Current Environment Variables**

You need these values (check your local `.env` file or PayFast dashboard):

```bash
MERCHANT_ID=242347
SECURED_KEY=4jSW7rfbd-m8VwB1_YKXXYwHGiHv
PAYFAST_TOKEN_URL=https://ipg1.apps.net.pk/Ecommerce/api/Transaction/GetAccessToken
PAYFAST_POST_URL=https://ipg1.apps.net.pk/Ecommerce/api/Transaction/PostTransaction
MERCHANT_CATEGORY_CODE=5816
CURRENCY_CODE=PKR
SUPABASE_URL=https://smlmbqgqkijodbxfpqen.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
RESEND_API_KEY=your_resend_key
FROM_EMAIL=hello@hatchepk.com
```

---

### **Step 2: Add to Vercel Dashboard**

1. **Go to Vercel Dashboard**
   - https://vercel.com/dashboard
   - Select your project (`hatchepk1` or similar)

2. **Go to Settings**
   - Click "Settings" tab
   - Click "Environment Variables" in left sidebar

3. **Add Each Variable**
   For EACH variable above, click **"Add New"**:
   
   ```
   Key:   MERCHANT_ID
   Value: 242347
   Environment: ✓ Production ✓ Preview ✓ Development
   ```
   
   ```
   Key:   SECURED_KEY
   Value: 4jSW7rfbd-m8VwB1_YKXXYwHGiHv
   Environment: ✓ Production ✓ Preview ✓ Development
   ```
   
   ... and so on for ALL variables

4. **Save Each One**

---

### **Step 3: Redeploy**

After adding all variables:

1. **Go to Deployments tab**
2. **Find latest deployment**
3. **Click "..." menu**
4. **Click "Redeploy"**
5. **Wait ~2 minutes**

---

## 🧪 **How to Verify**

### **Check Vercel Logs:**

1. Go to Vercel Dashboard → Deployments → Latest
2. Click on the deployment
3. Click "Functions" tab
4. Find `/api/payment/get-token`
5. Check logs for:

```
✅ GOOD:
Environment check: { hasMerchantId: true, hasSecuredKey: true, hasTokenUrl: true }

❌ BAD:
Missing environment variables
```

---

## 🔍 **Diagnostic Checklist**

Run through this checklist:

### ✅ **Issue #1: Missing Backend Endpoint**
**Status**: ✅ NOT THE ISSUE
- File exists: `/api/payment/get-token.js` ✅
- Vercel auto-detects it ✅

### ✅ **Issue #2: Netlify Functions**
**Status**: ✅ NOT APPLICABLE
- You're using Vercel, not Netlify ✅

### ✅ **Issue #3: CORS Issues**
**Status**: ✅ NOT THE ISSUE
- CORS headers are properly set ✅
```javascript
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
```

### ⚠️ **Issue #4: Environment Variables Missing**
**Status**: ⚠️ **THIS IS THE PROBLEM**
- Local `.env` file NOT deployed to Vercel ⚠️
- Backend can't find `MERCHANT_ID`, `SECURED_KEY`, etc. ⚠️
- **FIX**: Add to Vercel Dashboard (see Step 2 above)

---

## 🚀 **Quick Fix Commands**

If you have Vercel CLI installed:

```bash
# Install Vercel CLI (if not installed)
npm install -g vercel

# Login
vercel login

# Add environment variables (one by one)
vercel env add MERCHANT_ID production
# Enter value: 242347

vercel env add SECURED_KEY production
# Enter value: 4jSW7rfbd-m8VwB1_YKXXYwHGiHv

# ... repeat for all variables

# Redeploy
vercel --prod
```

---

## 📝 **Required Environment Variables**

I've created `.env.example` with all required variables. You need to add these **10 variables** to Vercel:

1. `MERCHANT_ID`
2. `SECURED_KEY`
3. `PAYFAST_TOKEN_URL`
4. `PAYFAST_POST_URL`
5. `MERCHANT_CATEGORY_CODE`
6. `CURRENCY_CODE`
7. `SUPABASE_URL`
8. `SUPABASE_SERVICE_ROLE_KEY`
9. `RESEND_API_KEY`
10. `FROM_EMAIL`

---

## ⏱️ **Timeline**

- **Time to add variables**: 5 minutes
- **Time to redeploy**: 2 minutes
- **Total time to fix**: ~7 minutes

---

## 🎯 **Expected Result After Fix**

Once you add the environment variables and redeploy:

```
✅ Payment gateway will connect
✅ No more 500/504 errors
✅ Token API will return successfully
✅ Payment flow will work end-to-end
```

---

**The fix is simple: Add environment variables to Vercel Dashboard!** 🚀

Would you like me to guide you through the Vercel dashboard steps in detail?
