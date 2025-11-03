# PayFast Test Transaction Guide

## Purpose
PayFast requires you to perform a test transaction and submit the **Test Order ID** in your merchant signup application to prove successful integration.

## Test Credentials (Provided by PayFast)

When you reach PayFast's payment page, use these credentials:

- **Bank Name:** Demo Bank
- **Account Number:** `12353940226802034243`
- **NIC Number:** `4210131315089`
- **OTP:** `123456`

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
3. Fill in **Step 1: Personal Information**
   - Enter your name, email, and mobile number
   - Click "Next"

4. On **Step 2: Payment**, click **"Complete Purchase"**
   - You'll be automatically redirected to PayFast's secure payment page

5. On **PayFast's Payment Page**, enter the test credentials:
   - Select **"Bank Account"** as payment method
   - **Bank Name:** Demo Bank
   - **Account Number:** `12353940226802034243`
   - **CNIC Number:** `4210131315089`
   
6. When prompted for **OTP**, enter: `123456`

7. Complete the payment on PayFast's page

8. You'll be redirected back to your website with the **Transaction ID**

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

