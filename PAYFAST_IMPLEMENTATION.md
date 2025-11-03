# PayFast Integration - Implementation Summary

## Overview
This document describes the PayFast payment gateway integration based on PayFast's official PHP example (`payment.php`).

## Integration Type: **Form Redirect**

This implementation uses the **Form Redirect** approach where:
1. Backend gets an access token from PayFast
2. Frontend submits a form to PayFast's payment page
3. Customer enters payment details on PayFast's secure page
4. PayFast redirects customer back to success/failure page
5. PayFast sends IPN (Instant Payment Notification) to our webhook

## Key Files

### 1. `/api/payment/get-token.js` (Backend - Vercel Serverless Function)
**Purpose:** Get PayFast access token

**Key Changes Based on PHP Example:**
- ✅ Uses **UPPERCASE** parameter names: `MERCHANT_ID`, `SECURED_KEY`, `BASKET_ID`, `TXNAMT`, `CURRENCY_CODE`
- ✅ Sends `application/x-www-form-urlencoded` data
- ✅ Does NOT send `grant_type` or `customer_ip` (they're not in the PHP example)

**Code:**
```javascript
const params = new URLSearchParams({
  MERCHANT_ID: merchantId,
  SECURED_KEY: securedKey,
  BASKET_ID: basketId,
  TXNAMT: amount.toString(),
  CURRENCY_CODE: currencyCode
});
```

### 2. `/api/payment/webhook.js` (Backend - IPN Handler)
**Purpose:** Receive payment notifications from PayFast

**Key Features:**
- ✅ Validates hash using SHA256: `basket_id|secured_key|merchant_id|err_code`
- ✅ Updates order status in Supabase database
- ✅ Returns 200 OK to acknowledge receipt

**Hash Validation:**
```javascript
const calculatedHash = crypto
  .createHash('sha256')
  .update(`${basketId}|${securedKey}|${merchantId}|${errCode}`)
  .digest('hex');
```

### 3. `/src/checkout.js` (Frontend)
**Purpose:** Initiate payment flow

**Flow:**
1. Get token from backend (`/api/payment/get-token`)
2. Create pending order in Supabase
3. Build form with UPPERCASE field names matching PHP example
4. Submit form to `https://ipguat.apps.net.pk/Ecommerce/api/Transaction/PostTransaction`
5. Customer is redirected to PayFast

**Form Fields (UPPERCASE - matching PHP):**
```javascript
{
  MERCHANT_ID,
  MERCHANT_NAME,
  TOKEN,
  BASKET_ID,
  TXNAMT,
  CURRENCY_CODE,
  ORDER_DATE,
  SUCCESS_URL,
  FAILURE_URL,
  CHECKOUT_URL, // IPN webhook
  CUSTOMER_EMAIL_ADDRESS,
  CUSTOMER_MOBILE_NO,
  SIGNATURE,
  VERSION,
  TXNDESC,
  PROCCODE,
  TRAN_TYPE
}
```

### 4. `/src/PaymentSuccess.js` & `/src/PaymentFailure.js`
**Purpose:** Handle customer redirects after payment

## Environment Variables

### Required in Vercel:
```
MERCHANT_ID=242347
SECURED_KEY=pGbBpFLTU64J0T3cnsnZ-GLeY1eY
PAYFAST_TOKEN_URL=https://ipguat.apps.net.pk/Ecommerce/api/Transaction/GetAccessToken
MERCHANT_CATEGORY_CODE=default

# Supabase (already configured)
SUPABASE_URL=...
SUPABASE_KEY=...
```

## Payment Flow Diagram

```
┌─────────────┐
│   Customer  │
│  on Website │
└──────┬──────┘
       │ 1. Clicks "Complete Purchase"
       ▼
┌──────────────────┐
│  Frontend React  │
│  (checkout.js)   │
└──────┬───────────┘
       │ 2. Calls backend API
       ▼
┌─────────────────────┐
│ Backend API         │
│ (get-token.js)      │
│                     │
│ POST to PayFast:    │
│ MERCHANT_ID         │
│ SECURED_KEY         │
│ BASKET_ID           │
│ TXNAMT              │
│ CURRENCY_CODE       │
└──────┬──────────────┘
       │ 3. Returns ACCESS_TOKEN
       ▼
┌──────────────────┐
│  Frontend React  │
│  (checkout.js)   │
│                  │
│  Submits FORM to │
│  PayFast with    │
│  token + details │
└──────┬───────────┘
       │ 4. Form redirects browser
       ▼
┌────────────────────┐
│   PayFast Page     │
│ (Secure, Hosted)   │
│                    │
│ Customer enters:   │
│ - Bank Account OR  │
│ - Card Details     │
│ - OTP              │
└──────┬─────────────┘
       │
       ├─── 5a. SUCCESS ──────┐
       │                      ▼
       │              ┌───────────────┐
       │              │ SUCCESS_URL   │
       │              │ (your site)   │
       │              └───────────────┘
       │
       ├─── 5b. FAILURE ──────┐
       │                      ▼
       │              ┌───────────────┐
       │              │ FAILURE_URL   │
       │              │ (your site)   │
       │              └───────────────┘
       │
       └─── 6. IPN (Background) ──┐
                                  ▼
                          ┌──────────────────┐
                          │  CHECKOUT_URL    │
                          │  (webhook.js)    │
                          │                  │
                          │  - Validates hash│
                          │  - Updates order │
                          │    in database   │
                          └──────────────────┘
```

## Test Credentials (Sandbox)

Use these on PayFast's payment page:
- **Bank Account:** `12353940226802034243`
- **NIC Number:** `4210131315089`
- **OTP:** `123456`

## Critical Security Features

1. ✅ **SECURED_KEY** is only stored in backend environment variables
2. ✅ **Hash Validation** on IPN webhook prevents spoofed callbacks
3. ✅ **Customer data** never sent to frontend (only to PayFast)
4. ✅ **Pending orders** created first, updated to "completed" by IPN

## Differences from Initial Implementation

### ❌ What was WRONG:
- Used lowercase parameter names: `merchant_id`, `secured_key`
- Sent unnecessary parameters: `grant_type`, `customer_ip`
- Implemented Scenario 1 (API with card collection on our site)

### ✅ What is CORRECT (based on PHP example):
- Uses **UPPERCASE** parameter names: `MERCHANT_ID`, `SECURED_KEY`
- Sends only the 5 required parameters for token request
- Uses **Form Redirect** (simpler, more secure, matches PHP example)

## Testing Checklist

- [ ] Environment variables set in Vercel
- [ ] Code deployed to Vercel
- [ ] Perform test transaction using sandbox credentials
- [ ] Verify redirect to PayFast works
- [ ] Enter test credentials on PayFast page
- [ ] Verify redirect back to success page
- [ ] Check Supabase `orders` table shows "completed"
- [ ] Obtain Transaction ID from success page or console
- [ ] Submit Transaction ID to PayFast merchant application

## Next Steps for Production

1. Update sandbox URLs to production URLs
2. Replace sandbox credentials with production credentials
3. Test with small real transaction
4. Monitor IPN webhook logs
5. Set up email notifications for successful orders

## Support

If issues occur:
1. Check Vercel function logs for errors
2. Verify environment variables are set correctly
3. Test token API call directly (see PHP example)
4. Check PayFast documentation: https://www.payfast.pk/

