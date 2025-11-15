# 🕐 External Cron Service Setup Guide

## Quick Setup for cron-job.org (Free)

### **Step 1: Sign Up**
1. Go to https://cron-job.org
2. Click "Sign Up" (free account)
3. Verify your email

### **Step 2: Create Cron Job**
1. Click "Create cronjob"
2. Fill in the form:

**Basic Settings**:
- **Title**: `Hatche Email Queue Processor`
- **Address (URL)**: `https://hatchepk.com/api/emails/process-queue?apiKey=YOUR_EMAIL_QUEUE_API_KEY`
  - Replace `YOUR_EMAIL_QUEUE_API_KEY` with your actual key from Vercel env vars

**Schedule**:
- **Execution schedule**: `Every 15 minutes`
- Or use cron expression: `*/15 * * * *`

**Request Settings**:
- **Request method**: `GET` (or `POST`)
- **Request timeout**: `30 seconds`

**Advanced** (Optional):
- **Status**: `Active`
- **Notifications**: Enable if you want alerts

3. Click "Create cronjob"

### **Step 3: Update vercel.json**

Remove or comment out the cron job:

```json
{
  "crons": [
    // Using external cron service (cron-job.org)
    // {
    //   "path": "/api/emails/process-queue",
    //   "schedule": "0 9 * * *"
    // }
  ]
}
```

### **Step 4: Test**

1. Wait 15 minutes
2. Check Vercel logs for email processing
3. Verify emails are being sent

### **Step 5: Monitor**

- Check cron-job.org dashboard for execution history
- Monitor Vercel logs for any errors
- Verify emails are being delivered

---

## Alternative: EasyCron Setup

1. Go to https://www.easycron.com
2. Sign up (free tier: 1 cron job)
3. Create cron job:
   - **URL**: `https://hatchepk.com/api/emails/process-queue?apiKey=YOUR_KEY`
   - **Schedule**: Every 15 minutes
   - **Method**: GET

---

## Security Note

Make sure your `EMAIL_QUEUE_API_KEY` is:
- ✅ Strong and random
- ✅ Set in Vercel environment variables
- ✅ Not committed to git
- ✅ Used in the cron job URL

---

## Troubleshooting

**Cron job not running?**
- Check cron-job.org dashboard for errors
- Verify URL is correct
- Check API key is valid
- Review Vercel logs

**Emails not processing?**
- Check Vercel function logs
- Verify database connection
- Check email queue table for pending emails
- Verify Resend API key is set

---

**Status**: Ready to set up  
**Cost**: Free  
**Frequency**: Every 15 minutes ✅

