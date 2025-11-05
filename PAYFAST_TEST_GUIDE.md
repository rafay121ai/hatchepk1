# PayFast Sandbox Testing Guide

**Status:** 🧪 TEST MODE (Sandbox)  
**Business:** Hatche  
**Account Type:** MERCHANT

---

## 🎯 What This Email Means

PayFast has created a **TEST account** for you. This allows you to:
- ✅ Test the payment integration without real money
- ✅ Verify everything works correctly
- ✅ Get a test order ID to complete your signup
- ✅ Once approved, you'll get PRODUCTION credentials

**Important:** These are SANDBOX credentials - DO NOT use real cards!

---

## 🔐 Your Sandbox Credentials

I've already updated your `.env` file with these credentials:

```
MERCHANT_ID=242347
SECURED_KEY=pGbBpFLTU64J0T3cnsnZ-GLeY1eY
```

**Previous credentials (102, zWHjBp2AlttNu1sK)** were replaced.

---

## 🚀 How to Test (Step-by-Step)

### Step 1: Deploy to Vercel with Sandbox Credentials

**A. Add Environment Variables in Vercel:**

Go to: **Vercel Dashboard → Your Project → Settings → Environment Variables**

Update these variables (or create if they don't exist):

| Variable | Value | Environments |
|----------|-------|--------------|
| `MERCHANT_ID` | `242347` | ✓ Production ✓ Preview ✓ Development |
| `SECURED_KEY` | `pGbBpFLTU64J0T3cnsnZ-GLeY1eY` | ✓ All |
| `PAYFAST_TOKEN_URL` | `https://ipguat.apps.net.pk/Ecommerce/api/Transaction/GetAccessToken` | ✓ All |
| `PAYFAST_POST_URL` | `https://ipguat.apps.net.pk/Ecommerce/api/Transaction/PostTransaction` | ✓ All |
| `CURRENCY_CODE` | `PKR` | ✓ All |

**B. Deploy:**
```bash
git add .
git commit -m "Update to PayFast sandbox credentials for testing"
git push
```

Wait for Vercel to deploy (~2 minutes).

---

### Step 2: Perform Test Transaction

**A. Visit your deployed site:**
```
https://hatchepk.com
```

**B. Navigate to a guide and click "Buy Now"**

**C. Fill checkout form with ANY test details:**
- First Name: `Test`
- Last Name: `User`
- Email: `test@example.com`
- Phone: `03001234567`

**D. Click "Complete Purchase"**
- You'll be redirected to PayFast payment page

**E. On PayFast page, use THESE TEST DETAILS (from email):**

**DO NOT USE REAL CARD DETAILS!**

Use this test account instead:

```
Bank Name: Demo Bank
Account No: 12353940226802034243
NIC number: 4210131315089
OTP: 123456
```

**F. Complete the payment:**
- Select "Bank Account" or similar option
- Enter the test account details above
- Enter OTP: `123456`
- Confirm payment

**G. After successful payment:**
- You'll be redirected to `/payment-success` on your site
- You'll see a transaction ID (ORDER-xxxxx)
- **SAVE THIS ORDER ID** - you need it for your signup application!

---

### Step 3: Submit Test Order ID

**A. Check Vercel logs:**
- Go to Vercel Dashboard → Your Project → Latest Deployment
- Click "Functions" → `api/payment/webhook`
- Look for:
  ```
  ✅ PAYMENT SUCCESSFUL
  Transaction ID: TXN-xxxxx
  Basket ID: ORDER-1730xxx-ABC
  ```

**B. Check your database:**
```sql
SELECT * FROM orders ORDER BY created_at DESC LIMIT 1;
```
- Verify `order_status` = `'completed'`
- Note the `id` (UUID)

**C. Use the Order ID in your PayFast signup:**
- Go back to PayFast signup application
- Find field: "Test Order ID"
- Enter the `BASKET_ID` (e.g., `ORDER-1730925596433-XRLSCP`)
- Submit application

---

## 🧪 Test Account Details (From Email)

**For Testing ONLY - Never use real details in Sandbox!**

### Test Bank Account:
```
Bank Name: Demo Bank
Account Number: 12353940226802034243
NIC Number: 4210131315089
OTP: 123456
```

### How to Use:
1. When PayFast asks for payment method, select "Bank Account" or "Wallet"
2. Enter the account number above
3. Enter NIC when asked
4. When OTP prompt appears, enter: `123456`
5. Transaction will succeed!

---

## ✅ What Happens During Test

### 1. Your Website:
- Creates order in database (`order_status: 'pending'`)
- Gets token from PayFast
- Redirects to PayFast payment page

### 2. PayFast (Sandbox):
- Shows payment form
- You enter TEST account details
- Processes payment (NO real money!)
- Redirects back to your site

### 3. Your Backend:
- Webhook receives notification
- Verifies hash
- Updates order (`order_status: 'completed'`)

### 4. Your Database:
- Order marked as completed
- Conversion tracked (if referral)
- Guide becomes available in "Your Guides"

---

## 🔄 After Testing is Approved

Once PayFast approves your application:

### You'll Receive:
- ✅ **Production Merchant ID**
- ✅ **Production Secured Key**
- ✅ Production API URLs (might be different)

### What to Do:
1. Update `.env` file with production credentials
2. Update environment variables in Vercel
3. Redeploy
4. Start accepting REAL payments!

**DO NOT** update credentials until you receive production approval!

---

## 📊 Verification Checklist

After test transaction, verify:

- [ ] Payment redirected to PayFast successfully
- [ ] Used test account details (not real card)
- [ ] Payment processed on PayFast
- [ ] Redirected back to `/payment-success`
- [ ] Order ID displayed on success page
- [ ] Order status in database is `'completed'`
- [ ] Webhook received notification (check Vercel logs)
- [ ] Guide appears in "Your Guides" page
- [ ] Can access and view the guide

---

## 🐛 Troubleshooting

### "Failed to get payment token"
- **Solution:** Make sure you updated environment variables in Vercel with new Merchant ID (242347)
- **Solution:** Redeploy after adding variables

### "Hash validation failed" in webhook
- **Solution:** Verify SECURED_KEY in Vercel matches: `pGbBpFLTU64J0T3cnsnZ-GLeY1eY`

### Order stuck on 'pending'
- **Solution:** Check Vercel function logs for webhook
- **Solution:** Ensure webhook URL is accessible: `https://hatchepk.com/api/payment/webhook`

### Can't complete payment on PayFast
- **Solution:** Use TEST account details from email (not real card)
- **Solution:** Make sure you're using: Account No `12353940226802034243`, OTP `123456`

---

## 📝 Important Notes

### Sandbox vs Production:

| Aspect | Sandbox (Current) | Production (After Approval) |
|--------|-------------------|------------------------------|
| **Money** | Fake (no real transactions) | Real payments processed |
| **Cards** | Use test account only | Real cards accepted |
| **Merchant ID** | 242347 | Will be different |
| **Secured Key** | pGbBpFLTU64J0T3cnsnZ-GLeY1eY | Will be different |
| **API URLs** | Might be same | Might change to production URLs |

### Security Reminder:
- ✅ Never commit `.env` to Git (already in `.gitignore`)
- ✅ Never use real cards in sandbox
- ✅ Never share SECURED_KEY publicly
- ✅ Update credentials in Vercel AND `.env`

---

## 🎯 Your Next Steps

### Immediate (Today):

1. **Update Vercel environment variables** with new Merchant ID (242347) and Secured Key
2. **Deploy to Vercel** (`git push`)
3. **Perform test transaction** using test account details
4. **Get test Order ID** from success page or database
5. **Submit Order ID** in PayFast signup application

### After PayFast Approval:

1. Receive production credentials (different from 242347)
2. Update `.env` file
3. Update Vercel environment variables
4. Redeploy
5. Start accepting real payments! 🎉

---

## 📞 Support

**If test fails:**
- Check Vercel deployment logs
- Verify environment variables match exactly
- Ensure you used test account (not real card)
- Contact me if stuck

**If PayFast payment page doesn't load:**
- Clear browser cache
- Try different browser
- Check Vercel logs for token generation errors

---

**Current Status:** 🧪 Ready for Sandbox Testing  
**Next Step:** Update Vercel env vars with Merchant ID **242347**  
**Goal:** Get test Order ID to complete signup  

Good luck with your test transaction! 🚀

