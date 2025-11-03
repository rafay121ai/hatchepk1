# PayFast Payment Gateway Integration

## ✅ Integration Complete

Your website is now integrated with PayFast payment gateway. Here's everything you need to know:

## 🔐 Security Implementation

### What's Secure:
- ✅ **SECURED_KEY never exposed** - Only used in backend API (Vercel serverless functions)
- ✅ **.env file in .gitignore** - Credentials never committed to Git
- ✅ **Token-based flow** - Backend generates token, frontend redirects to PayFast
- ✅ **No card details stored** - PayFast handles all payment processing

### How It Works:
1. Customer clicks "Complete Purchase"
2. **Backend API** (`/api/payment/get-token`) calls PayFast with SECURED_KEY
3. PayFast returns an access token
4. Frontend creates a form and **redirects customer to PayFast**
5. Customer enters card details on PayFast's secure page
6. PayFast processes payment and redirects back to your site
7. **Webhook** (`/api/payment/webhook`) receives payment confirmation
8. Order status updated to 'completed' in database

---

## 📁 Files Created

### Backend (Vercel Serverless Functions):
```
api/payment/
├── get-token.js    # Generates PayFast access token (uses SECURED_KEY)
└── webhook.js      # Receives payment notifications from PayFast
```

### Frontend:
```
src/
├── PaymentSuccess.js    # Success page after payment
├── PaymentSuccess.css
├── PaymentFailure.js    # Failure page if payment fails
└── PaymentFailure.css
```

### Configuration:
```
.env                # Your credentials (NEVER commit)
.env.example        # Template for other developers
```

---

## 🚀 Vercel Deployment

### Step 1: Add Environment Variables in Vercel

Go to: **Vercel Dashboard → Your Project → Settings → Environment Variables**

Add these variables (select all environments: Production, Preview, Development):

| Variable Name | Value |
|---------------|-------|
| `MERCHANT_ID` | `102` |
| `SECURED_KEY` | `zWHjBp2AlttNu1sK` |
| `PAYFAST_TOKEN_URL` | `https://ipguat.apps.net.pk/Ecommerce/api/Transaction/GetAccessToken` |
| `PAYFAST_POST_URL` | `https://ipguat.apps.net.pk/Ecommerce/api/Transaction/PostTransaction` |
| `CURRENCY_CODE` | `PKR` |

### Step 2: Deploy

```bash
git add .
git commit -m "Add PayFast payment gateway integration"
git push
```

Vercel will automatically deploy your changes.

### Step 3: Verify Environment Variables

After deployment, visit:
```
https://your-domain.vercel.app/api/payment/get-token
```

You should see: `{"success":false,"error":"Method Not Allowed"}` (this is correct - it needs POST)

---

## 🧪 Testing the Payment Flow

### Test Locally:

1. Start the app:
```bash
npm start
```

2. Navigate to a guide and click "Buy Now"
3. Fill in customer details
4. Click "Complete Purchase"
5. **You'll be redirected to PayFast** (may show error in local dev - that's normal)

### Test in Production:

1. Deploy to Vercel (ensure env vars are set)
2. Navigate to a guide and click "Buy Now"
3. Complete checkout
4. You'll be redirected to PayFast payment page
5. Use test cards (if sandbox) or real cards (if production)
6. After payment, you'll return to `/payment-success` or `/payment-failure`

---

## 💳 Test Cards (Sandbox Mode)

**Meezan Card:**
- Number: `4166 5306 3696 3967`
- Expiry: `07/2028`
- CVV: `123`

**Mastercard:**
- Number: `5123450000000008`
- Expiry: `12/25`
- CVV: `244`

---

## 🔄 Payment Flow Diagram

```
Customer → Your Site → Backend API → PayFast API
                           ↓
                      Get Token
                           ↓
Customer ← Redirect ← Your Site
   ↓
PayFast Payment Page (Customer enters card)
   ↓
Payment Processing
   ↓
Success/Failure Redirect → Your Site
   ↓
Webhook Notification → Your Backend → Update Order
```

---

## 📊 Database Updates

When payment succeeds:
1. Webhook receives notification from PayFast
2. Order status updated from 'pending' → 'completed'
3. Conversion tracking triggered (if referral exists)
4. Customer can access guide in "Your Guides"

---

## ⚠️ Important Notes

### Security:
- **NEVER** expose `SECURED_KEY` in frontend code
- **ALWAYS** keep `.env` file out of Git
- **ONLY** use `SECURED_KEY` in backend API functions

### Production vs Sandbox:
- Current credentials are for: **Sandbox** (testing)
- For production, update credentials in Vercel environment variables

### Webhook URL:
- PayFast needs to know your webhook URL
- Production: `https://your-domain.vercel.app/api/payment/webhook`
- Configure this in PayFast merchant dashboard

---

## 🐛 Troubleshooting

### "Failed to get payment token"
- Check Vercel environment variables are set
- Ensure all environments (Production, Preview, Development) are selected
- Redeploy after adding environment variables

### "Payment failed" or stuck at PayFast
- Verify `MERCHANT_ID` and `SECURED_KEY` are correct
- Check if you're using sandbox or production credentials
- Ensure `SUCCESS_URL` and `FAILURE_URL` are correct

### Order not showing in "Your Guides"
- Check order status is 'completed' in database
- Verify `product_name` matches guide `title` exactly
- Check webhook received payment confirmation

---

## 📞 Support

If you encounter issues:
1. Check Vercel function logs: Dashboard → Deployments → Functions
2. Check browser console for errors
3. Verify environment variables are set correctly
4. Contact PayFast support if payment processing fails

---

**Integration completed on:** November 3, 2025
**Status:** ✅ Ready for deployment and testing

