# 🧪 Test Payment Now - Live Debugging Guide

## ✅ **Your Functions ARE Deployed**

I can see `/api/payment/get-token` is deployed:
- Size: 202 kB
- Region: IAD1 (US East)
- Runtime: Node 22
- **Status: LIVE** ✅

---

## 🎯 **Now Let's Test & Debug**

### **Step 1: Open Vercel Function Logs**

1. **Vercel Dashboard** → **Deployments** → **Latest**
2. Click **"Functions"** tab
3. Find `/api/payment/get-token`
4. Click on it
5. **Keep this tab OPEN**

---

### **Step 2: Open Browser Console**

1. Go to: https://hatchepk.com/checkout
2. Press **F12** (or Cmd+Option+I on Mac)
3. Click **"Console"** tab
4. **Keep this open**

---

### **Step 3: Attempt Payment**

1. Fill out the checkout form
2. Click "Complete Purchase"
3. **WATCH BOTH TABS**:
   - Browser console (frontend logs)
   - Vercel function logs (backend logs)

---

## 📊 **What to Look For**

### **Browser Console Should Show:**
```
🔄 Calling token API...
Basket ID: ORDER-xxx
Amount: 300
(wait 10-30 seconds...)
📡 Token API responded with status: 200 or 504
```

### **Vercel Function Logs Should Show:**
```
=== GET TOKEN REQUEST ===
Request body: { basketId: "...", amount: 300 }
Environment check: { hasMerchantId: true, hasSecuredKey: true, hasTokenUrl: true }
Calling PayFast API...
Sending to PayFast (form-encoded, UPPERCASE): { ... }
(wait...)
PayFast response: { ACCESS_TOKEN: "..." }
✅ Token received successfully
```

---

## 🎯 **Possible Outcomes**

### **Outcome A: No Logs in Vercel**
**Meaning**: Function not being triggered
**Check**:
- Is the function endpoint correct? `/api/payment/get-token`
- Is CORS blocking it?
- Check Network tab in browser for the request

### **Outcome B: Logs Show "Missing environment variables"**
**Meaning**: Env vars not deployed to production
**Fix**:
- Go to Settings → Environment Variables
- Click each variable
- Verify "Production" is checked
- Redeploy

### **Outcome C: Logs Show PayFast Call Then Timeout**
**Meaning**: PayFast is too slow OR Vercel killed the function
**Check in logs**:
- Does it reach "Calling PayFast API..."?
- Does it timeout at exactly 10s? (Vercel not updated)
- Does it timeout at 28s? (PayFast too slow)

### **Outcome D: Success!**
**Logs show**: "✅ Token received successfully"
**Browser**: Redirects to PayFast ✅

---

## 🔍 **If It Times Out**

### **Check the EXACT timeout duration:**

If it fails after:
- **10 seconds** → Vercel hasn't deployed `maxDuration: 30` yet
- **28 seconds** → PayFast is genuinely slow, need to increase timeout further
- **Immediately** → Function not running at all, check environment variables

---

## 📋 **Copy-Paste Template**

After testing, copy-paste this to me:

```
DEPLOYMENT STATUS: Ready / Building / Error
TIME UNTIL FAILURE: 10s / 28s / immediate
BROWSER CONSOLE ERROR: (paste here)
VERCEL FUNCTION LOGS: (paste here)
```

This will tell me EXACTLY what to fix! 🎯

---

**Go test it now and report back what you see in both places!** 🚀

