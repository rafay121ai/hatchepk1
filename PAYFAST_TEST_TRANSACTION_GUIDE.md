# PayFast Test Transaction Guide

## Purpose
PayFast requires you to perform a test transaction and submit the **Test Order ID** in your merchant signup application to prove successful integration.

## Test Credentials (Provided by PayFast)

### For Bank Account Payments:
- **Bank Name:** Demo Bank
- **Account Number:** 12353940226802034243
- **NIC Number:** 4210131315089
- **OTP:** 123456

### For Card Payments (if provided):
- Use the test card details provided by PayFast in your sandbox documentation

## Steps to Get Your Test Order ID

### 1. Deploy Your Application
```bash
# Make sure all changes are committed
git add .
git commit -m "Added PayFast Scenario 1 integration"
git push

# Deploy to Vercel
vercel --prod
```

### 2. Add Environment Variables to Vercel
Go to your Vercel dashboard and add:
```
MERCHANT_ID=242347
SECURED_KEY=pGbBpFLTU64J0T3cnsnZ-GLeY1eY
PAYFAST_TOKEN_URL=https://ipguat.apps.net.pk/Ecommerce/api/Transaction/GetAccessToken
PAYFAST_TEMP_TOKEN_URL=https://ipguat.apps.net.pk/Ecommerce/api/Transaction/transaction/token
PAYFAST_TOKENIZED_URL=https://ipguat.apps.net.pk/Ecommerce/api/Transaction/transaction/tokenized
MERCHANT_CATEGORY_CODE=default
```

### 3. Perform Test Transaction

1. Go to your deployed website: `https://hatchepk1.vercel.app`
2. Navigate to "Our Guides" and select a guide to purchase
3. Fill in the checkout form:
   - **Personal Information:** Use your real name and email
   - **Mobile Number:** Use your real mobile number (OTP will be sent here)
   - **Card Details:** Use the test card provided by PayFast OR test bank account

4. **If using Bank Account Payment:**
   - When prompted, use the Demo Bank credentials:
     - Account: `12353940226802034243`
     - NIC: `4210131315089`
   - When OTP prompt appears, enter: `123456`

5. **Complete the transaction**

### 4. Get Your Test Order ID

After successful payment, you'll receive a **Transaction ID** in the success message or in your browser console.

**Where to find it:**
- Success page will show: "Transaction ID: XXXXX"
- Browser console (F12) will log: "Transaction ID: XXXXX"
- Your Supabase `orders` table will have the order with status "completed"

### 5. Submit to PayFast

Take the Transaction ID and submit it in the "Test Order ID" field in your PayFast merchant signup application.

## Alternative: Check Database

If you miss the Transaction ID on screen:

1. Go to your Supabase dashboard
2. Open the `orders` table
3. Find the most recent order with `order_status = 'completed'`
4. Use the `id` (UUID) as your Test Order ID

## Troubleshooting

### If transaction fails:
- Check Vercel function logs for errors
- Verify all environment variables are set correctly
- Make sure you're using the sandbox URLs (not production)
- Check that the OTP is exactly `123456`

### If OTP is not working:
- PayFast may send a real OTP to your mobile number during sandbox testing
- Check your phone for SMS
- If no SMS, try using `123456` as documented

## Important Notes

⚠️ **Use Sandbox Credentials Only**
- Never use real bank account or card details in sandbox
- Always use the test credentials provided by PayFast

✅ **What PayFast is Checking**
- That you can successfully integrate their API
- That you can process a transaction end-to-end
- That you handle responses correctly

🎯 **Your Goal**
- Get a successful transaction
- Obtain the Transaction ID
- Submit it to PayFast to complete your merchant application

