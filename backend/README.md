# PayFast Backend API

Backend server for PayFast payment gateway integration.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Ensure your `.env.local` file in the project root has:

```env
PAYFAST_MERCHANT_ID=242347
PAYFAST_SECURED_KEY=pGbBpFLTU64J0T3cnsnZ-GLeY1eY
PAYFAST_MERCHANT_NAME=Hatche
PAYFAST_TOKEN_API_URL=https://ipguat.apps.net.pk/Ecommerce/api/Transaction/GetAccessToken
PAYFAST_FORM_POST_URL=https://ipguat.apps.net.pk/Ecommerce/api/Transaction/PostTransaction
```

The server automatically loads `.env.local` from the project root.

### 3. Start Server

```bash
# Production mode
npm start

# Development mode (with auto-reload)
npm run dev
```

The server will run on `http://localhost:3001`

## 📍 API Endpoints

### POST `/api/payment/get-token`

Get PayFast access token.

**Request:**
```json
{
  "amount": 299.00,
  "basketId": "ORDER-123456789" // optional
}
```

**Response:**
```json
{
  "success": true,
  "token": "abc123xyz...",
  "basketId": "ORDER-123456789",
  "merchantId": "242347",
  "generatedDateTime": "2024-01-01T12:00:00Z"
}
```

### POST `/api/payment/webhook`

PayFast IPN (Instant Payment Notification) webhook handler.

Receives form data from PayFast and verifies payment status.

### GET `/api/payment/health`

Health check endpoint.

## 🔒 Security

- `PAYFAST_SECURED_KEY` is **NEVER** exposed to frontend
- All token generation happens server-side only
- IPN hash verification uses server-side crypto module

## 🐛 Troubleshooting

### Server won't start

- Check Node.js version: `node --version` (should be 18+)
- Verify `.env.local` exists and has all required variables
- Check port 3001 is not already in use

### Token API fails

- Verify `PAYFAST_TOKEN_API_URL` is correct
- Check `PAYFAST_MERCHANT_ID` and `PAYFAST_SECURED_KEY` are set
- Review server logs for detailed error messages

## 📝 Notes

- Server loads environment variables from `../.env.local`
- Uses Node.js 18+ built-in `fetch` API
- CORS is configured to allow requests from `http://localhost:3000`

