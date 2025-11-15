# 🚀 Quick Start Testing Guide

## Automated Testing Scripts

### **1. Test All Internal Links**
```bash
npm run test:links
```
Checks all internal pages for 404 errors.

### **2. Test Email Endpoints**
```bash
npm run test:emails
```
Verifies all email API endpoints are accessible.

### **3. Test Console Errors**
```bash
npm run build
npm run test:console
```
Checks production build for console.error calls.

### **4. Verify SEO Elements**
```bash
npm run test:seo
```
Checks for required SEO meta tags and schema markup.

### **5. Run All Automated Tests**
```bash
npm run test:all
```
Runs all automated tests in sequence.

### **6. Lighthouse Audit**
```bash
# Install Lighthouse CLI first
npm install -g lighthouse

# Run audit
npm run test:lighthouse
```

Or use Chrome DevTools:
1. Open Chrome DevTools (F12)
2. Go to "Lighthouse" tab
3. Select categories
4. Click "Generate report"

---

## Manual Testing Checklist

### **Critical Tests (Must Pass)**

1. **Sign Up Flow**
   - [ ] Sign up with new email
   - [ ] Check email for welcome message
   - [ ] Verify account created

2. **Checkout Flow**
   - [ ] Add guide to cart
   - [ ] Complete checkout
   - [ ] Verify payment redirects to PayFast
   - [ ] Check order confirmation email

3. **Guide Viewing**
   - [ ] Purchase guide
   - [ ] View guide in "Your Guides"
   - [ ] Verify PDF loads correctly

4. **Email Automation**
   - [ ] Welcome email received
   - [ ] Post-guide email received (2 hours after viewing)
   - [ ] Feedback email received (24 hours after viewing)

5. **Mobile Testing**
   - [ ] Test on iPhone
   - [ ] Test on Android
   - [ ] Verify responsive design
   - [ ] Check touch interactions

---

## Browser Testing

Test in these browsers:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

---

## Performance Testing

### **PageSpeed Insights**
1. Go to: https://pagespeed.web.dev/
2. Enter your URL
3. Run test for Mobile and Desktop
4. Verify scores > 90

### **Core Web Vitals**
- LCP (Largest Contentful Paint) < 2.5s
- FID (First Input Delay) < 100ms
- CLS (Cumulative Layout Shift) < 0.1

---

## Email Testing

### **Email Client Testing**
Test emails in:
- [ ] Gmail (desktop)
- [ ] Gmail (mobile app)
- [ ] Outlook (desktop)
- [ ] Outlook (web)
- [ ] Apple Mail

### **Email Functionality**
- [ ] All links work
- [ ] Images load
- [ ] Unsubscribe link works
- [ ] Reply-to address monitored

---

## Security Testing

- [ ] HTTPS enabled
- [ ] Security headers configured
- [ ] No sensitive data in console
- [ ] API keys not exposed
- [ ] CORS configured correctly

---

## Pre-Launch Final Checks

- [ ] All automated tests pass
- [ ] Manual testing complete
- [ ] Performance scores > 90
- [ ] No console errors
- [ ] All forms work
- [ ] Email automation working
- [ ] Mobile responsive
- [ ] SEO elements present
- [ ] Analytics tracking
- [ ] Error monitoring set up

---

## Testing Report

After testing, document:
- Date tested
- Tester name
- Environment (production/staging)
- Issues found
- Ready for launch: Yes/No

---

**Need Help?** Check `PRE_LAUNCH_TESTING_CHECKLIST.md` for detailed testing procedures.

