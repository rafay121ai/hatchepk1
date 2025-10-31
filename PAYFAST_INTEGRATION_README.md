# PayFast Payment Gateway Integration

Complete integration guide for PayFast payment gateway in your React + Express application.

## 📁 File Structure

```
hatchepk/
├── .env.local                          # Environment variables (DO NOT COMMIT)
├── .env.example                        # Example env file (commit this)
├── .gitignore                          # Ensures .env files are ignored
├── src/
│   ├── utils/
│   │   └── payfast.js                  # PayFast frontend utilities
│   ├── checkout.js                     # Checkout form component
│   ├── PaymentSuccess.js               # Success page component
│   └── PaymentCancel.js                # Failure page component
├── backend/
│   ├── .env.local                      # Backend environment variables (DO NOT COMMIT)
│   ├── package.json                    # Backend dependencies
│   ├── server.js                       # Express server setup
│   ├── api/
│   │   └── payment.js                  # Payment API routes
│   └── payfast-utils.js                # PayFast backend utilities
└── package.json                        # Frontend dependencies
```

## 🚀 Setup Instructions

### 1. Install Dependencies

**Frontend:**
```bash
npm install
```

**Backend:**
```bash
cd backend
npm install
```

### 2. Configure Environment Variables

**Frontend `.env.local` (root directory):**
```bash
# Backend API URL
REACT_APP_BACKEND_API_URL=https://hatchepk1.vercel.app

# PayFast Configuration (Public)
REACT_APP_PAYFAST_MERCHANT_NAME=Hatche
REACT_APP_PAYFAST_FORM_POST_URL=https://ipguat.apps.net.pk/Ecommerce/api/Transaction/PostTransaction

# PayFast URLs (Public)
REACT_APP_PAYFAST_SUCCESS_URL=http://localhost:3000/payment/success
REACT_APP_PAYFAST_FAILURE_URL=http://localhost:3000/payment/failure
REACT_APP_PAYFAST_CHECKOUT_URL=http://localhost:3000/checkout
```

**Backend `.env.local` (backend directory):**
```bash
# PayFast Credentials (KEEP SECRET - Server-side only)
PAYFAST_MERCHANT_ID=242347
PAYFAST_SECURED_KEY=pGbBpFLTU64J0T3cnsnZ-GLeY1eY
PAYFAST_MERCHANT_NAME=Hatche

# PayFast API URLs (Sandbox)
PAYFAST_TOKEN_API_URL=https://ipguat.apps.net.pk/Ecommerce/api/Transaction/GetAccessToken
PAYFAST_FORM_POST_URL=https://ipguat.apps.net.pk/Ecommerce/api/Transaction/PostTransaction

# Supabase Configuration (if needed)
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```

**⚠️ IMPORTANT:** 
- Add `.env.local` to `.gitignore` (already included)
- Never commit `.env.local` files
- Never expose `PAYFAST_SECURED_KEY` in frontend code
- Use `REACT_APP_` prefix for frontend environment variables

### 3. Create `.env.example` Files

**Root `.env.example`:**
```bash
# Backend API URL
REACT_APP_BACKEND_API_URL=https://hatchepk1.vercel.app

# PayFast Configuration (Public)
REACT_APP_PAYFAST_MERCHANT_NAME=Hatche
REACT_APP_PAYFAST_FORM_POST_URL=https://ipguat.apps.net.pk/Ecommerce/api/Transaction/PostTransaction

# PayFast URLs (Public)
REACT_APP_PAYFAST_SUCCESS_URL=http://localhost:3000/payment/success
REACT_APP_PAYFAST_FAILURE_URL=http://localhost:3000/payment/failure
REACT_APP_PAYFAST_CHECKOUT_URL=http://localhost:3000/checkout
```

**Backend `.env.example`:**
```bash
# PayFast Credentials (KEEP SECRET - Server-side only)
PAYFAST_MERCHANT_ID=your_merchant_id
PAYFAST_SECURED_KEY=your_secured_key
PAYFAST_MERCHANT_NAME=Hatche

# PayFast API URLs (Sandbox)
PAYFAST_TOKEN_API_URL=https://ipguat.apps.net.pk/Ecommerce/api/Transaction/GetAccessToken
PAYFAST_FORM_POST_URL=https://ipguat.apps.net.pk/Ecommerce/api/Transaction/PostTransaction

# Supabase Configuration
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
```

## 🔧 Implementation Flow

### Step 1: Customer Initiates Payment
1. Customer fills checkout form at `/checkout`
2. Customer enters: Name, Email, Mobile Number (Pakistani format)
3. Customer clicks "Pay" button

### Step 2: Get Access Token
1. Frontend calls `POST https://hatchepk1.vercel.app/api/payment/get-token`
2. Backend requests token from PayFast API
3. Backend returns JSON with:
   ```json
   {
     "success": true,
     "token": "access_token_here",
     "basketId": "ORDER-1234567890-ABC123",
     "merchantId": "242347",
     "generatedDateTime": "2025-01-01T12:00:00"
   }
   ```

### Step 3: Redirect to PayFast
1. Frontend creates hidden form with payment parameters
2. Form submits POST to PayFast gateway
3. Customer redirected to PayFast payment page

### Step 4: Customer Completes Payment
1. Customer enters card/wallet details
2. Customer receives and enters OTP
3. PayFast processes payment

### Step 5: Payment Notification (IPN)
1. PayFast sends POST request to `/api/payment/webhook`
2. Webhook verifies hash integrity using SHA256
3. Webhook updates order status in database
4. Returns HTTP 200 JSON to acknowledge receipt

### Step 6: Customer Redirect
1. Customer redirected to `/payment/success` or `/payment/failure`
2. Transaction details displayed
3. Google Analytics tracks purchase (success only)

## 🧪 Testing

### Start Development Servers

**Terminal 1 - Frontend:**
```bash
npm start
# Runs on http://localhost:3000
```

**Terminal 2 - Backend:**
```bash
cd backend
npm start
# Runs on https://hatchepk1.vercel.app
```

### Test Cards (Sandbox Environment)

**Meezan Card:**
- Number: `4166 5306 3696 3967`
- Expiry: `07/2028`
- CVV: `123`

**Mastercard:**
- Number: `5123450000000008`
- Expiry: `12/25`
- CVV: `244`

**Test Wallet:**
- Mobile: `03123456789`

### Test Payment Flow

1. Navigate to `http://localhost:3000/checkout`
2. Fill in test details:
   - First Name: Test
   - Last Name: User
   - Email: test@example.com
   - Mobile: 03001234567 (Pakistani format - 11 digits starting with 0)
3. Navigate through checkout steps
4. Click "Pay PKR [amount]"
5. Use test card details above
6. Complete OTP verification
7. Check success/failure page

### Test Webhook Locally

Use **ngrok** to expose your local server:

```bash
# Install ngrok (if not installed)
# macOS: brew install ngrok
# Or download from https://ngrok.com/

# Start ngrok tunnel
ngrok http 3001

# Use the HTTPS URL provided by ngrok for CHECKOUT_URL
# Example: https://abc123.ngrok.io/api/payment/webhook
```

Update PayFast dashboard with the ngrok webhook URL.

## 🔒 Security Best Practices

### ✅ DO:
- Store `PAYFAST_SECURED_KEY` only in backend `.env.local`
- Validate all incoming IPN webhooks using hash verification
- Use HTTPS in production
- Log all transactions for audit trail
- Implement rate limiting on API endpoints
- Validate amounts match between token request and payment
- Never expose sensitive keys in frontend code
- Use environment variables for all configuration

### ❌ DON'T:
- Never expose `PAYFAST_SECURED_KEY` in frontend code
- Never commit `.env.local` to version control
- Never skip hash verification in webhook
- Never trust client-side data without server verification
- Never log sensitive credentials
- Don't store payment card details (PayFast handles this)

## 📊 Database Schema (Supabase)

The application uses the following tables in Supabase:

### `orders` Table
```sql
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id VARCHAR(100) UNIQUE NOT NULL,
  customer_email VARCHAR(255),
  customer_name VARCHAR(255),
  customer_mobile VARCHAR(20),
  product_name VARCHAR(255),
  guide_id UUID,
  amount DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'PKR',
  order_status VARCHAR(20) DEFAULT 'pending', -- pending, completed, failed
  payment_id VARCHAR(255),
  payment_method VARCHAR(50), -- PayFast, Card, Wallet
  payment_date TIMESTAMP,
  err_code VARCHAR(10),
  err_msg TEXT,
  by_ref_id VARCHAR(100), -- Referral ID
  raw_response TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### `conversions` Table (Auto-created by trigger)
```sql
CREATE TABLE conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id),
  affiliate_id UUID REFERENCES affiliates(id),
  commission DECIMAL(10, 2),
  status VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🔍 API Endpoints

### GET `/api/payment/health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "service": "PayFast Payment API",
  "timestamp": "2025-01-01T12:00:00.000Z",
  "merchantId": "configured"
}
```

### POST `/api/payment/get-token`
Get PayFast access token.

**Request Body:**
```json
{
  "amount": 100.00,
  "currencyCode": "PKR",
  "basketId": "optional-basket-id"
}
```

**Response:**
```json
{
  "success": true,
  "token": "access_token_here",
  "basketId": "ORDER-1234567890-ABC123",
  "merchantId": "242347",
  "generatedDateTime": "2025-01-01T12:00:00"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error message here"
}
```

### POST `/api/payment/webhook`
PayFast IPN webhook handler.

**Request (form-urlencoded or JSON):**
- PayFast sends IPN data including:
  - `basket_id`
  - `transaction_id`
  - `err_code`
  - `err_msg`
  - `transaction_amount`
  - `validation_hash`
  - And other PayFast IPN parameters

**Response:**
```json
{
  "success": true,
  "message": "IPN received and processed"
}
```

## 🔍 Troubleshooting

### Issue: "Failed to get payment token"
- ✅ Check if backend server is running (`cd backend && npm start`)
- ✅ Verify backend environment variables are set correctly
- ✅ Check `PAYFAST_MERCHANT_ID` and `PAYFAST_SECURED_KEY` in backend `.env.local`
- ✅ Ensure API URL is correct
- ✅ Check network connectivity
- ✅ Verify backend server is accessible from frontend

### Issue: "Unexpected token '<', "<!DOCTYPE "... is not valid JSON"
- ✅ Backend server is not running - start it with `cd backend && npm start`
- ✅ Backend URL is incorrect - check `REACT_APP_BACKEND_API_URL`
- ✅ Backend CORS is not configured - check `backend/server.js`
- ✅ Backend endpoint doesn't exist - verify route is `/api/payment/get-token`

### Issue: "Invalid hash verification" in webhook
- ✅ Verify `PAYFAST_SECURED_KEY` matches exactly (no extra spaces)
- ✅ Check hash calculation order: `basket_id|secured_key|merchant_id|err_code`
- ✅ Ensure pipe `|` characters are included
- ✅ Log both calculated and received hashes for debugging
- ✅ Check `backend/payfast-utils.js` hash calculation

### Issue: Webhook not receiving calls
- ✅ Ensure webhook URL is publicly accessible (use ngrok for local testing)
- ✅ Check if URL is HTTPS in production
- ✅ Verify `CHECKOUT_URL` is correctly set in payment form (`checkout.js`)
- ✅ Check PayFast logs/support for webhook delivery status
- ✅ Verify backend server is running and accessible

### Issue: Payment successful but order not updating
- ✅ Check webhook logs in backend console
- ✅ Verify database connection (Supabase)
- ✅ Ensure proper error handling in webhook
- ✅ Check if IPN data is being parsed correctly
- ✅ Verify order is created with correct `basket_id`
- ✅ Check Supabase table structure matches schema

### Issue: Frontend can't connect to backend
- ✅ Verify `REACT_APP_BACKEND_API_URL` is set correctly
- ✅ Check backend server is running on correct port (3001)
- ✅ Verify CORS is configured in `backend/server.js`
- ✅ Check firewall/network settings

## 🌐 Production Deployment

### Before Going Live:

1. **Update URLs:**
   - Change PayFast URLs from UAT to production
   - Update all callback URLs to production domain
   - Ensure URLs use HTTPS
   - Update `REACT_APP_BACKEND_API_URL` to production API URL

2. **Get Production Credentials:**
   - Request production credentials from PayFast
   - Update environment variables in production
   - Never use sandbox credentials in production

3. **Environment Variables:**
   - Set production environment variables on hosting platform
   - For frontend (e.g., Vercel, Netlify): Set `REACT_APP_*` variables
   - For backend (e.g., Heroku, Railway): Set `PAYFAST_*` variables
   - Keep `PAYFAST_SECURED_KEY` secret and server-side only

4. **Test Thoroughly:**
   - Test all payment scenarios
   - Verify webhook is working with production URL
   - Check error handling
   - Test success/failure redirects
   - Verify Google Analytics tracking

5. **Security Checklist:**
   - ✅ Environment variables secured
   - ✅ No credentials in code
   - ✅ HTTPS enabled
   - ✅ Hash verification implemented
   - ✅ CORS properly configured
   - ✅ Rate limiting configured (recommended)
   - ✅ Logging enabled
   - ✅ `.env.local` in `.gitignore`

### Deployment Platforms

**Frontend (React):**
- Vercel
- Netlify
- AWS Amplify
- Firebase Hosting

**Backend (Express):**
- Heroku
- Railway
- Render
- AWS Elastic Beanstalk
- DigitalOcean App Platform

## 📞 Support

- **PayFast Documentation:** Check integration documents provided
- **PayFast Support:** Contact PayFast technical support
- **Webhook Testing:** Use ngrok for local webhook testing: `ngrok http 3001`

## 📝 Additional Notes

### Key Files

- **`src/utils/payfast.js`**: Frontend utilities (token generation, form creation)
- **`src/checkout.js`**: Checkout form and payment initiation
- **`src/PaymentSuccess.js`**: Success page after payment
- **`src/PaymentCancel.js`**: Failure page after payment
- **`backend/api/payment.js`**: Express API routes
- **`backend/payfast-utils.js`**: Backend utilities (hash verification, IPN handling)

### Customization

- Modify checkout form fields in `src/checkout.js`
- Add custom validation in `src/utils/payfast.js`
- Implement your own database logic in `backend/api/payment.js` webhook handler
- Customize success/failure pages in `PaymentSuccess.js` and `PaymentCancel.js`

### Monitoring

Consider implementing:
- Transaction monitoring dashboard
- Failed payment alerts
- Webhook delivery monitoring
- Payment analytics
- Error tracking (e.g., Sentry)

---

**Last Updated:** January 2025  
**Version:** 1.0.0  
**Integration Type:** PayFast Sandbox (UAT)  
**Framework:** React + Express.js

