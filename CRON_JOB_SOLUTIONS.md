# 🔧 Cron Job Solutions for Vercel Hobby Plan

## ⚠️ **The Issue**

Vercel Hobby plan only allows **daily cron jobs** (once per day maximum).  
Your current cron runs **every 15 minutes** (`*/15 * * * *`), which requires Pro plan.

## ✅ **Solutions (Choose One)**

---

## **Solution 1: Use Free External Cron Service** ⭐ **RECOMMENDED**

### **Best Option**: Use a free external cron service

**Services Available**:
- [cron-job.org](https://cron-job.org) - Free, reliable
- [EasyCron](https://www.easycron.com) - Free tier available
- [Cronitor](https://cronitor.io) - Free tier available

### **Setup Steps**:

1. **Remove cron from vercel.json** (or change to daily)
2. **Sign up for free cron service** (cron-job.org recommended)
3. **Create cron job**:
   - **URL**: `https://hatchepk.com/api/emails/process-queue?apiKey=YOUR_API_KEY`
   - **Schedule**: Every 15 minutes (`*/15 * * * *`)
   - **Method**: GET or POST
   - **Add header**: `X-API-Key: YOUR_API_KEY` (if supported)

### **Pros**:
- ✅ Free
- ✅ More frequent than daily
- ✅ No Vercel plan upgrade needed
- ✅ Can monitor cron job status

### **Cons**:
- ⚠️ External dependency
- ⚠️ Need to manage API key security

---

## **Solution 2: Change to Daily Schedule**

### **Update vercel.json**:

```json
{
  "crons": [
    {
      "path": "/api/emails/process-queue",
      "schedule": "0 9 * * *"  // Once per day at 9 AM UTC
    }
  ]
}
```

### **Adjust Email Timing**:

Update email scheduling to account for daily processing:
- Post-guide emails: Schedule for next day instead of 2 hours
- Feedback emails: Schedule for next day instead of 24 hours
- Re-engagement: Already daily, no change needed

### **Pros**:
- ✅ Works with Hobby plan
- ✅ No external services
- ✅ Simple

### **Cons**:
- ⚠️ Emails delayed up to 24 hours
- ⚠️ Less responsive user experience

---

## **Solution 3: Hybrid Approach** ⭐ **BEST UX**

### **Send Some Emails Immediately, Queue Others**

**Immediate (No Queue)**:
- Welcome emails ✅ (already immediate)
- Order confirmations ✅ (already immediate)

**Daily Batch**:
- Post-guide engagement (can wait until next day)
- Feedback requests (can wait until next day)
- Re-engagement (already daily)

### **Implementation**:

1. **Remove cron job** from vercel.json
2. **Change email scheduling** to send immediately or next day
3. **Process queue once per day** manually or via daily cron

---

## **Solution 4: Upgrade to Vercel Pro**

### **Cost**: $20/month

**Pros**:
- ✅ Unlimited cron jobs
- ✅ More frequent execution
- ✅ Better performance limits

**Cons**:
- ⚠️ Additional cost

---

## 🎯 **RECOMMENDED SOLUTION**

### **Use External Cron Service (Solution 1)**

**Why?**
- Free
- More frequent than daily
- Better user experience
- No code changes needed

**Setup Guide**:

1. **Go to [cron-job.org](https://cron-job.org)**
2. **Sign up** (free account)
3. **Create new cron job**:
   - **Title**: "Hatche Email Queue Processor"
   - **URL**: `https://hatchepk.com/api/emails/process-queue?apiKey=YOUR_EMAIL_QUEUE_API_KEY`
   - **Schedule**: Every 15 minutes
   - **Request Method**: GET
   - **Save**

4. **Update vercel.json** to remove or comment out cron:
```json
{
  "crons": [
    // Commented out - using external cron service
    // {
    //   "path": "/api/emails/process-queue",
    //   "schedule": "*/15 * * * *"
    // }
  ]
}
```

5. **Test**: Wait 15 minutes and check logs

---

## 📋 **Quick Fix (Right Now)**

If you want to keep using Vercel cron, change to daily:

```json
{
  "crons": [
    {
      "path": "/api/emails/process-queue",
      "schedule": "0 9 * * *"  // Once per day at 9 AM UTC
    }
  ]
}
```

This will work with Hobby plan, but emails will be processed once per day instead of every 15 minutes.

---

## ✅ **My Recommendation**

**Use cron-job.org** (Solution 1) - it's free, reliable, and gives you the frequency you need without upgrading Vercel.

**Next Steps**:
1. Sign up for cron-job.org
2. Create cron job pointing to your API
3. Remove/comment cron from vercel.json
4. Test and verify emails are processing

