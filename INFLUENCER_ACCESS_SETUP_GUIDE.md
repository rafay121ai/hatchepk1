# 🎓 Influencer Access System - Complete Setup Guide

A comprehensive system for providing temporary, device-limited access to your premium guides for influencers and reviewers.

---

## 📋 **Table of Contents**

1. [System Overview](#system-overview)
2. [Database Setup](#database-setup)
3. [Environment Variables](#environment-variables)
4. [Creating Influencer Codes](#creating-influencer-codes)
5. [How It Works](#how-it-works)
6. [Testing](#testing)
7. [Monitoring Usage](#monitoring-usage)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 **System Overview**

### **Features:**
- ✅ **Hidden access page** (`/influencer-access`) - not linked anywhere on site
- ✅ **Device limiting** - Max 2 devices per code (configurable)
- ✅ **5-day expiry** (configurable per code)
- ✅ **Session persistence** - works across refreshes, lost on tab close
- ✅ **View-only access** - Uses existing SecureGuideViewer (no copy/print/download)
- ✅ **Usage tracking** - All access attempts logged
- ✅ **Email notifications** - Sent to essanirafay@gmail.com when code is used
- ✅ **Watermarked preview** - Clear "Influencer Preview" badge

### **Security:**
- Device fingerprinting prevents sharing
- Session tokens expire with code
- Hash-based validation
- IP and user-agent logging
- Cannot be bypassed by clearing cookies

---

## 🗄️ **Database Setup**

### **Step 1: Run SQL Schema**

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Copy the entire contents of `INFLUENCER_ACCESS_SCHEMA.sql`
5. Paste into the SQL Editor
6. Click **Run**

This creates 3 tables:
- `access_codes` - Store influencer codes
- `access_code_sessions` - Track device sessions
- `access_code_logs` - Log all access attempts

### **Step 2: Verify Tables Created**

```sql
-- Run this to verify
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'access_%';
```

You should see 3 tables listed.

---

## ⚙️ **Environment Variables**

### **Add to Vercel Dashboard:**

Go to: **Vercel Dashboard** → **Your Project** → **Settings** → **Environment Variables**

Add this **NEW** variable:

```
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**How to get Service Role Key:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click **Settings** → **API**
4. Copy the **`service_role`** key (NOT the anon key!)
5. Add it to Vercel

**⚠️ IMPORTANT:** The service role key bypasses Row Level Security (RLS). Never expose it to the frontend!

### **Existing Required Variables:**
Make sure these are already in Vercel:
- `RESEND_API_KEY` ✅ (for email notifications)
- `FROM_EMAIL=hello@hatchepk.com` ✅

---

## 🔑 **Creating Influencer Codes**

### **Method: SQL in Supabase**

Go to **SQL Editor** and run:

```sql
-- First, get the guide details you want to share
SELECT id, slug, title FROM guides;

-- Then create an access code (example for Fatima Ahmed)
INSERT INTO access_codes (
  code,
  influencer_name,
  guide_id,
  guide_slug,
  guide_title,
  max_devices,
  expires_at,
  created_by,
  notes
) VALUES (
  'FATIMA-CREATOR',                                      -- Code (similar to influencer name)
  'Fatima Ahmed',                                         -- Influencer name
  'your-guide-id-from-above',                            -- Replace with actual guide ID
  'creator-gold-rush',                                    -- Guide slug
  'The Creator Gold Rush for Pakistani Women',            -- Guide title
  2,                                                      -- Max 2 devices
  NOW() + INTERVAL '5 days',                             -- Expires in 5 days
  'admin',                                                -- Who created it
  'Promotional code for Fatima Ahmed - Instagram review'
);
```

### **Code Naming Convention:**

Format: `[INFLUENCER-NAME]` or `[INFLUENCER-KEYWORD]`

Good examples:
- `FATIMA-CREATOR`
- `AYESHA-TECH`
- `HASSAN-BUSINESS`
- `ZAINAB-REVIEW`

**Note:** Codes are case-insensitive. `FATIMA-CREATOR` = `fatima-creator`

### **Adjustable Parameters:**

```sql
max_devices          -- 1 to 5 devices (default: 2)
expires_at           -- Any date/time (default: NOW() + INTERVAL '5 days')
```

---

## 🔄 **How It Works**

### **1. Share Access Link**

Send influencer this link:
```
https://hatchepk.com/influencer-access
```

### **2. Enter Code**

Influencer enters their code (e.g., `FATIMA-CREATOR`)

### **3. Validation Process**

```
✅ Code exists and is active
✅ Code hasn't expired
✅ Device limit not exceeded
✅ Generate device fingerprint
✅ Create/update session
✅ Send email notification to you
✅ Log access attempt
➡️ Redirect to guide viewer
```

### **4. Session Management**

- **Session lasts**: Until code expires (5 days)
- **Survives**: Page refreshes
- **Lost on**: Tab close, browser close, clearing sessionStorage
- **Heartbeat**: Verified every 1 minute
- **Same device**: Can use multiple times within expiry

### **5. Device Limiting**

First device:
```
Device A accesses → Session created → ✅ Works
```

Second device (allowed):
```
Device B accesses → New session created → ✅ Works
```

Third device (blocked):
```
Device C accesses → ❌ "Maximum 2 devices reached"
```

### **6. Email Notification**

You receive an email at `essanirafay@gmail.com`:

```
Subject: 🔑 Influencer Code Used: FATIMA-CREATOR

Code: FATIMA-CREATOR
Influencer: Fatima Ahmed
Guide: The Creator Gold Rush for Pakistani Women
Time: November 7, 2024 at 6:30 PM PKT
IP Address: 123.456.789.0
Expires: November 12, 2024
```

---

## 🧪 **Testing**

### **Test 1: Valid Code**

1. Visit: `https://hatchepk.com/influencer-access`
2. Enter a valid code
3. Should redirect to guide viewer
4. Check email for notification

### **Test 2: Invalid Code**

1. Enter: `INVALID-CODE`
2. Should show: "Invalid or inactive access code"

### **Test 3: Expired Code**

```sql
-- Create an expired code
INSERT INTO access_codes (...) VALUES (
  'TEST-EXPIRED',
  ...,
  NOW() - INTERVAL '1 day'  -- Already expired
);
```

Test it → Should show: "Access code has expired"

### **Test 4: Device Limit**

1. Open in Chrome → Enter code → Works ✅
2. Open in Firefox → Enter code → Works ✅ (if max_devices = 2)
3. Open in Safari → Enter code → Error ❌ "Maximum 2 devices reached"

### **Test 5: Session Persistence**

1. Access guide with code
2. Refresh page → Should still work
3. Close tab → Open new tab → Visit directly → Should need code again

---

## 📊 **Monitoring Usage**

### **View All Active Codes**

```sql
SELECT 
  code,
  influencer_name,
  guide_title,
  max_devices,
  expires_at,
  CASE 
    WHEN expires_at < NOW() THEN 'EXPIRED'
    WHEN NOT is_active THEN 'INACTIVE'
    ELSE 'ACTIVE'
  END as status,
  created_at
FROM access_codes
WHERE is_active = TRUE
ORDER BY created_at DESC;
```

### **View Code Usage**

```sql
SELECT 
  ac.code,
  ac.influencer_name,
  COUNT(DISTINCT acs.device_fingerprint) as active_devices,
  ac.max_devices,
  ac.expires_at
FROM access_codes ac
LEFT JOIN access_code_sessions acs ON ac.id = acs.access_code_id
GROUP BY ac.id
ORDER BY ac.created_at DESC;
```

### **View Access Logs**

```sql
SELECT 
  ac.code,
  ac.influencer_name,
  acl.action_type,
  acl.ip_address,
  acl.error_message,
  acl.created_at
FROM access_code_logs acl
LEFT JOIN access_codes ac ON acl.access_code_id = ac.id
ORDER BY acl.created_at DESC
LIMIT 50;
```

### **Action Types:**
- `code_validated` - Successfully validated
- `access_denied` - Invalid/expired code
- `device_limit_reached` - Too many devices
- `guide_viewed` - Guide was viewed (logged every minute)

---

## 🔧 **Management Commands**

### **Deactivate a Code**

```sql
UPDATE access_codes 
SET is_active = FALSE 
WHERE code = 'FATIMA-CREATOR';
```

### **Extend Expiry**

```sql
UPDATE access_codes 
SET expires_at = NOW() + INTERVAL '5 days'
WHERE code = 'FATIMA-CREATOR';
```

### **Change Device Limit**

```sql
UPDATE access_codes 
SET max_devices = 3
WHERE code = 'FATIMA-CREATOR';
```

### **Remove All Sessions (Force Re-auth)**

```sql
DELETE FROM access_code_sessions
WHERE access_code_id = (
  SELECT id FROM access_codes WHERE code = 'FATIMA-CREATOR'
);
```

### **Clean Up Expired Codes**

```sql
-- Remove sessions for expired codes
DELETE FROM access_code_sessions
WHERE access_code_id IN (
  SELECT id FROM access_codes
  WHERE expires_at < NOW()
);

-- Deactivate expired codes
UPDATE access_codes 
SET is_active = FALSE
WHERE expires_at < NOW() AND is_active = TRUE;
```

---

## 🚨 **Troubleshooting**

### **Problem: Email notifications not working**

**Check:**
1. Is `RESEND_API_KEY` in Vercel environment variables?
2. Is `FROM_EMAIL=hello@hatchepk.com` set?
3. Is `hello@hatchepk.com` verified in Resend?

**Test:**
```bash
# Check Vercel logs
vercel logs
```

### **Problem: "Invalid session" error**

**Cause:** SessionStorage was cleared or tab was closed

**Solution:** User needs to re-enter code (normal behavior)

### **Problem: Device limit reached but should work**

**Check:**
```sql
-- See how many devices are registered
SELECT device_fingerprint, created_at, last_accessed_at
FROM access_code_sessions
WHERE access_code_id = (
  SELECT id FROM access_codes WHERE code = 'YOUR-CODE'
);
```

**Fix:** Remove old sessions if needed
```sql
DELETE FROM access_code_sessions
WHERE access_code_id = (SELECT id FROM access_codes WHERE code = 'YOUR-CODE')
AND last_accessed_at < NOW() - INTERVAL '1 day';
```

### **Problem: Code not found error**

**Check:**
1. Is code typed correctly? (case-insensitive)
2. Is `is_active = TRUE`?
3. Has it expired?

```sql
SELECT * FROM access_codes WHERE code = 'YOUR-CODE';
```

---

## 📱 **User Experience**

### **What Influencer Sees:**

1. **Access Page:**
   - Clean, minimal design
   - Purple gradient background
   - Single input for code
   - "Access Guide" button

2. **Guide Viewer:**
   - Full guide access (view-only)
   - Badge: "🎓 Influencer Preview - [Name]"
   - Watermark: "INFLUENCER PREVIEW - NOT FOR DISTRIBUTION"
   - Expires date shown

3. **Restrictions:**
   - ❌ No printing
   - ❌ No downloading
   - ❌ No copy/paste (handled by SecureGuideViewer)
   - ✅ Full reading access
   - ✅ Works on mobile/tablet

---

## 🎯 **Best Practices**

1. **Code Naming:**
   - Use influencer's name
   - Keep it simple and memorable
   - Uppercase for consistency

2. **Expiry:**
   - 5 days default is good for reviews
   - Extend if needed for longer campaigns
   - Don't make too long (security)

3. **Device Limit:**
   - 2 devices is standard
   - 3 if influencer requested
   - Never more than 5

4. **Communication:**
   - Send link via DM/Email
   - Include code in same message
   - Mention it's temporary access

5. **Monitoring:**
   - Check logs weekly
   - Clean up expired codes monthly
   - Review unusual access patterns

---

## 📞 **Support**

If you encounter issues:

1. Check Vercel logs: `vercel logs`
2. Check Supabase logs: Dashboard → Logs
3. Verify environment variables are set
4. Test with a fresh code

For implementation help, review the code files:
- `src/InfluencerAccess.js` - Access page
- `src/InfluencerGuideViewer.js` - Guide viewer
- `api/influencer/validate-code.js` - Validation API
- `api/influencer/verify-session.js` - Session verification

---

**Your influencer access system is now complete and ready to use!** 🎉

Share `https://hatchepk.com/influencer-access` with influencers and create codes as needed.

