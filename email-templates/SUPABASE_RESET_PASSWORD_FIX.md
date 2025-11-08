# 🔧 Supabase Password Reset Configuration Fix

## ⚠️ **Issue**
When users click the password reset link, they are automatically logged in instead of being redirected to the password change page.

---

## ✅ **Solution**

You need to configure Supabase to redirect to your password reset page instead of auto-logging users in.

### **Step 1: Update Supabase Email Template**

1. Go to **Supabase Dashboard** → Your Project
2. Navigate to **Authentication** → **Email Templates**
3. Find **Reset Password** template
4. Update the template to use this code:

```html
<h2>Reset Your Password</h2>
<p>Hi there,</p>
<p>You requested to reset your password for your Hatche account.</p>
<p>Click the button below to set a new password:</p>
<p><a href="{{ .SiteURL }}/reset-password?access_token={{ .Token }}&type=recovery">Reset Password</a></p>
<p>If you didn't request this, you can safely ignore this email.</p>
<p>This link will expire in 24 hours.</p>
<p>Best regards,<br>The Hatche Team</p>
```

### **Step 2: Configure URL Settings**

1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL** to: `https://hatchepk.com`
3. Add **Redirect URLs**:
   - `https://hatchepk.com/reset-password`
   - `http://localhost:3001/reset-password` (for local testing)

### **Step 3: Update Auth Settings**

1. Go to **Authentication** → **Settings**
2. Scroll to **Email Auth**
3. Set **Redirect URL (for recovery)**: `https://hatchepk.com/reset-password`
4. Uncheck **"Enable automatic sign-in on email confirmation"** if enabled

---

## 🔒 **How It Works Now**

### **Correct Flow:**
```
1. User clicks "Forgot Password?" ✅
2. Enters email → Receives reset link ✅
3. Clicks link → Redirected to /reset-password ✅
4. URL contains: ?access_token=xxx&type=recovery ✅
5. ResetPassword.js verifies token ✅
6. User changes password ✅
7. Password saved → Auto-redirects to home ✅
```

---

## 🧪 **Testing Steps**

1. Go to your website
2. Click "Login" → "Forgot Password?"
3. Enter your email
4. Check your inbox
5. Click the reset link
6. **Expected**: Should go to `/reset-password` page with password form
7. **Not Expected**: Should NOT auto-login

---

## 📧 **Optional: Use Custom Email Template**

You can use our branded password reset template from:
`email-templates/password-reset-email.html`

Just copy the HTML and paste it into the Supabase Email Template editor.

---

## ⚠️ **Important Notes**

- The token is valid for 24 hours
- Users will be logged out when they access the reset page
- After setting new password, they auto-redirect to home
- They must log in again with their new password

---

## 🆘 **Still Not Working?**

If users are still auto-logged in:

1. Check Supabase → Authentication → Settings
2. Look for **"Enable email confirmations"**
3. Make sure **"Secure email change"** is enabled
4. Clear browser cookies/cache and test again

---

**After making these changes, users will be redirected to the password change page instead of being auto-logged in!** ✅

