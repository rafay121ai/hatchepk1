# 🔑 EMAIL_QUEUE_API_KEY Setup Guide

## What is EMAIL_QUEUE_API_KEY?

The `EMAIL_QUEUE_API_KEY` is a **custom security key** that you generate yourself. It's **NOT** from an external service - it's your own secret key used to protect the email queue processing endpoint from unauthorized access.

## Why Do You Need It?

The email queue processor endpoint (`/api/emails/process-queue`) needs to be protected because:
- It processes sensitive user emails
- It's called by cron jobs (automated)
- Without protection, anyone could trigger email sending
- It prevents abuse and unauthorized access

## How to Generate Your API Key

### **Option 1: Using Node.js (Recommended)**

Run this command in your terminal:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Example output:**
```
36bd58c8d2462b5b1fac9d50fc34df5394348d4b6f3321ab11119ab433f011f6
```

### **Option 2: Using Online Generator**

Visit: https://randomkeygen.com/
- Use "CodeIgniter Encryption Keys" (256-bit)
- Copy one of the generated keys

### **Option 3: Using OpenSSL**

```bash
openssl rand -hex 32
```

### **Option 4: Using Python**

```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

## Where to Set the API Key

### **1. Vercel Environment Variables**

1. Go to your Vercel dashboard
2. Select your project (hatchepk)
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
5. Add:
   - **Key**: `EMAIL_QUEUE_API_KEY`
   - **Value**: `[your-generated-key-here]` (paste the key you generated)
   - **Environment**: Production, Preview, Development (select all)
6. Click **Save**

### **2. Update vercel.json**

After setting the environment variable, update `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/emails/process-queue?apiKey=YOUR_ACTUAL_KEY_HERE",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

**⚠️ IMPORTANT**: Replace `YOUR_ACTUAL_KEY_HERE` with the actual key you generated.

**OR** (Better approach) - Use environment variable in the path:

```json
{
  "crons": [
    {
      "path": "/api/emails/process-queue",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

And update the API to read from headers instead:

```javascript
// The cron job will need to pass the key in headers
// Vercel cron jobs can't pass query params, so use headers
```

Actually, let me check the current implementation...

## Current Implementation

The current code checks for the API key in two places:
1. Query parameter: `?apiKey=...`
2. Header: `x-api-key`

For Vercel cron jobs, you'll need to use the query parameter approach.

## Recommended Setup

### **For Vercel Cron Jobs:**

Update `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/emails/process-queue?apiKey=36bd58c8d2462b5b1fac9d50fc34df5394348d4b6f3321ab11119ab433f011f6",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

**⚠️ Security Note**: Since the key is in `vercel.json`, make sure:
- Don't commit sensitive keys to public repos
- Use different keys for dev/prod
- Rotate keys periodically

### **For External Cron Services:**

If using external cron service (cron-job.org, EasyCron):

1. Set up the cron job to call:
   ```
   https://hatchepk.com/api/emails/process-queue?apiKey=YOUR_KEY_HERE
   ```

2. Use the same key you set in Vercel environment variables

## Security Best Practices

1. **Generate a Strong Key**
   - Use at least 32 bytes (64 hex characters)
   - Use cryptographically secure random generator
   - Don't use predictable patterns

2. **Keep It Secret**
   - Never commit to public repositories
   - Don't share in chat/email
   - Store only in environment variables

3. **Use Different Keys**
   - Different key for development
   - Different key for production
   - Rotate keys every 6-12 months

4. **Monitor Access**
   - Check logs for unauthorized access attempts
   - Set up alerts for failed authentication

## Testing Your API Key

After setting up, test the endpoint:

```bash
# Test with correct key (should work)
curl "https://hatchepk.com/api/emails/process-queue?apiKey=YOUR_KEY_HERE"

# Test with wrong key (should return 401)
curl "https://hatchepk.com/api/emails/process-queue?apiKey=wrong-key"
```

## Quick Setup Checklist

- [ ] Generate secure random key (64 hex characters)
- [ ] Add `EMAIL_QUEUE_API_KEY` to Vercel environment variables
- [ ] Update `vercel.json` cron path with your key
- [ ] Test the endpoint with correct key
- [ ] Test the endpoint with wrong key (should fail)
- [ ] Deploy and verify cron job runs

## Example Generated Key

Here's a secure key generated for you (you can use this or generate your own):

```
36bd58c8d2462b5b1fac9d50fc34df5394348d4b6f3321ab11119ab433f011f6
```

**Copy this key and:**
1. Add it to Vercel environment variables as `EMAIL_QUEUE_API_KEY`
2. Use it in `vercel.json` cron path

---

**Need Help?** If you have issues, check:
- Vercel logs for authentication errors
- Environment variables are set correctly
- Cron job schedule is correct
- API endpoint is accessible

