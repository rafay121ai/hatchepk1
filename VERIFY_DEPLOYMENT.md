# ✅ Verify Vercel Deployment is Live

## 🎯 **Current Code State**

Your `api/payment/get-token.js` should have:
- ✅ `timeout: 28000` (28 seconds)
- ✅ Using `axios` with form-encoded data
- ✅ Production URL: `ipg1.apps.net.pk`

Your `vercel.json` should have:
- ✅ `maxDuration: 30` (30 seconds)

---

## 📋 **Step-by-Step Verification**

### **Step 1: Check Latest Commit on GitHub**

1. Go to: https://github.com/rafay121ai/hatchepk1
2. Look at latest commit
3. Should say: One of these recent commits

**Verify the commit is there!**

---

### **Step 2: Check Vercel Deployment Status**

1. Go to: https://vercel.com/dashboard
2. Select your project
3. Click **"Deployments"** tab
4. Look at the TOP deployment

**Check:**
- ✓ Status shows "Ready" (green checkmark)
- ✓ Commit message matches GitHub
- ✓ Time shows "X minutes ago" (recent)
- ✓ No errors or warnings

**If status is "Building" or "Queued"**: WAIT for it to finish!

---

### **Step 3: View Vercel Function Logs (CRITICAL)**

This is the most important check!

1. In Vercel Deployments
2. Click on the **latest "Ready" deployment**
3. Click **"Functions"** tab (top navigation)
4. Find **`/api/payment/get-token`** in the list
5. Click on it

**What you should see:**
- Function details
- Logs section (may be empty until you test)

**Leave this tab OPEN!**

---

### **Step 4: Test Payment & Watch Logs**

1. Open TWO browser windows side by side:
   - **Window 1**: hatchepk.com/checkout
   - **Window 2**: Vercel function logs (from Step 3)

2. In Window 1:
   - Fill out checkout form
   - Click "Complete Purchase"

3. In Window 2 (Vercel logs):
   - **Watch for logs to appear in REAL-TIME**

---

### **Step 5: Read the Logs**

**If logs appear, look for:**

```
✅ GOOD:
=== GET TOKEN REQUEST ===
Environment check: { hasMerchantId: true, hasSecuredKey: true, hasTokenUrl: true }
Calling PayFast API...
PayFast response: { ACCESS_TOKEN: "xyz..." }
✅ Token received successfully

❌ BAD:
Missing environment variables
timeout exceeded
(or no logs at all)
```

---

## 🚨 **Common Issues & Solutions**

### **Issue 1: No Logs Appear**
**Meaning**: Function not being called OR deployment not live
**Fix**: 
- Check deployment is "Ready" (not building)
- Wait 2-3 minutes after "Ready" status
- Clear browser cache (Cmd+Shift+R)

### **Issue 2: "Missing environment variables"**
**Meaning**: Env vars not set in Vercel
**Fix**:
- Settings → Environment Variables
- Check all 10 variables exist
- Check "Production" is selected for each
- Redeploy after adding

### **Issue 3: "timeout exceeded"**
**Meaning**: PayFast is taking >28 seconds
**Fix**:
- Increase `vercel.json` maxDuration to 60
- Increase axios timeout to 55000
- Redeploy

### **Issue 4: Logs show error from PayFast**
**Meaning**: Credentials wrong or PayFast issue
**Fix**:
- Verify MERCHANT_ID = 242347
- Verify SECURED_KEY is correct
- Check PayFast dashboard for issues

---

## 🎯 **Quick Checklist**

Before testing, verify:
- [ ] Latest commit is on GitHub
- [ ] Vercel shows "Ready" status (green)
- [ ] Deployment is less than 10 minutes old
- [ ] You're testing on hatchepk.com (not localhost)
- [ ] Browser dev tools (F12) is open to Console tab
- [ ] Vercel function logs tab is open

---

## 📞 **What to Report Back**

After testing, tell me:

1. **Vercel deployment status**: Ready? Building? Error?
2. **What appeared in Vercel function logs**: Copy-paste the logs
3. **What appeared in browser console**: Any errors?
4. **How long did it take**: Did it timeout immediately or after 10s/28s?

This will tell us EXACTLY what's wrong! 🔍

---

**Don't test until you see "Ready" status in Vercel!**

