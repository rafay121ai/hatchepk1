# Supabase Email Templates Setup Guide

This guide will help you set up branded email templates for Hatche authentication emails (signup confirmation, password reset, etc.)

---

## 📧 **Templates Included:**

1. **Signup Confirmation Email** - `supabase-confirmation-email.html`
2. **Password Reset Email** - `supabase-password-reset-email.html`

---

## 🔧 **How to Set Up:**

### **Step 1: Access Supabase Dashboard**

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your **Hatche project**
3. Click **Authentication** in the left sidebar
4. Click **Email Templates**

---

### **Step 2: Update Site URL (Important!)**

Before updating templates:

1. Click **URL Configuration** (under Authentication)
2. Set **Site URL** to: `https://hatchepk.com`
3. Add **Redirect URLs**:
   ```
   https://hatchepk.com/**
   https://hatchepk.com/auth/callback
   ```
4. Click **Save**

---

### **Step 3: Update Email Templates**

#### **A. Confirm Signup Template:**

1. Click **Email Templates** → **Confirm signup**
2. Copy the entire contents of `supabase-confirmation-email.html`
3. Paste it into the **Message (HTML)** field
4. **Subject line:** `Welcome to Hatche - Confirm Your Email`
5. Click **Save**

#### **B. Reset Password Template:**

1. Click **Email Templates** → **Reset password**
2. Copy the entire contents of `supabase-password-reset-email.html`
3. Paste it into the **Message (HTML)** field
4. **Subject line:** `Reset Your Hatche Password`
5. Click **Save**

#### **C. Magic Link Template (Optional):**

1. Click **Email Templates** → **Magic Link**
2. Use the same template as **Confirm signup** (or customize as needed)
3. **Subject line:** `Your Hatche Login Link`
4. Click **Save**

---

## ⚙️ **Template Variables:**

Supabase automatically replaces these variables in your templates:

| Variable | Description | Example |
|----------|-------------|---------|
| `{{ .ConfirmationURL }}` | Full confirmation/reset link | `https://hatchepk.com/auth/confirm?token=...` |
| `{{ .SiteURL }}` | Your site URL | `https://hatchepk.com` |
| `{{ .TokenHash }}` | Raw token (rarely needed) | `abc123...` |
| `{{ .Token }}` | Raw token (rarely needed) | `abc123...` |

**Note:** Always use `{{ .ConfirmationURL }}` for buttons/links - it's pre-configured with all parameters.

---

## ✅ **Testing:**

### **Test Signup Confirmation:**

1. Sign up with a new email on your site
2. Check your inbox
3. Verify the email looks branded
4. Click "Confirm Email Address" button
5. Should redirect to `https://hatchepk.com`

### **Test Password Reset:**

1. Go to your login page
2. Click "Forgot Password"
3. Enter your email
4. Check inbox for branded reset email
5. Click "Reset Password" button
6. Should redirect to `https://hatchepk.com/reset-password`

---

## 🎨 **Customization:**

To customize the templates further:

1. **Colors:**
   - Brand Color: `#73160f` (change all instances)
   - Background: `#fdfcf1` (cream)
   - Text: `#2c2c2c` (dark gray)

2. **Logo:**
   - Replace the text "Hatche" in the header with an `<img>` tag:
   ```html
   <img src="https://hatchepk.com/HATCHE800.png" alt="Hatche" style="max-width: 120px; height: auto;">
   ```

3. **Add Social Links:**
   ```html
   <a href="https://www.instagram.com/hatchepk/" style="margin: 0 10px;">
     <img src="instagram-icon-url" alt="Instagram" style="width: 24px; height: 24px;">
   </a>
   ```

---

## ⚠️ **Important Notes:**

1. **Email clients have limited CSS support** - stick to inline styles
2. **Test in multiple email clients** (Gmail, Outlook, Apple Mail)
3. **Images should be hosted online** (use your domain or Supabase storage)
4. **Keep emails under 102KB** for best deliverability
5. **Changes are instant** - no deployment needed

---

## 📊 **Email Deliverability:**

Supabase uses their own SMTP by default, which works well. For production:

1. **SPF/DKIM:** Already configured by Supabase
2. **Custom Domain:** If you want `from: hello@hatchepk.com`, use custom SMTP (Option 2)
3. **Rate Limits:** Supabase has generous limits for auth emails

---

## 🔄 **Reverting to Default:**

If you want to go back to Supabase's default templates:

1. Go to **Email Templates**
2. Click **Reset to default** at the bottom
3. Confirm

---

## 📝 **Need Help?**

- Supabase Docs: [https://supabase.com/docs/guides/auth/auth-email-templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- Test emails in development: Use a tool like [Mailtrap](https://mailtrap.io/) or [MailHog](https://github.com/mailhog/MailHog)

---

**Your branded authentication emails are now ready!** 🎉

