# 🚀 Pre-Launch Testing Checklist

Complete testing guide to ensure everything works before going live.

---

## ✅ **FUNCTIONALITY TESTS**

### **Forms & Submissions**

- [ ] **Sign Up Form**
  - [ ] Valid email/password creates account
  - [ ] Invalid email shows error message
  - [ ] Password validation works (min 6 chars)
  - [ ] Welcome email sent after signup
  - [ ] User redirected to correct page after signup
  - [ ] **Test**: Sign up with new email → Check email inbox → Verify welcome email

- [ ] **Login Form**
  - [ ] Valid credentials log in successfully
  - [ ] Invalid credentials show error
  - [ ] "Forgot Password" link works
  - [ ] Password reset email sent
  - [ ] **Test**: Login with test account → Verify session created

- [ ] **Checkout Form**
  - [ ] All required fields validated
  - [ ] Form submits to PayFast correctly
  - [ ] Order confirmation email sent
  - [ ] Order saved to database
  - [ ] **Test**: Complete checkout flow → Verify order in database → Check email

- [ ] **Affiliate Application Form**
  - [ ] Form submits successfully
  - [ ] Affiliate welcome email sent
  - [ ] Application saved to database
  - [ ] **Test**: Submit affiliate form → Check email → Verify in database

- [ ] **Contact/Feedback Forms**
  - [ ] All fields submit correctly
  - [ ] Confirmation message displayed
  - [ ] **Test**: Submit test feedback → Verify received

### **Search Functionality**

- [ ] **Guide Search**
  - [ ] Search returns accurate results
  - [ ] Search works with partial matches
  - [ ] Search is case-insensitive
  - [ ] Empty search shows all guides
  - [ ] **Test**: Search "creator" → Verify relevant guides appear

- [ ] **Search Performance**
  - [ ] Results load quickly (< 500ms)
  - [ ] No console errors during search
  - [ ] **Test**: Search multiple terms → Check performance

### **Newsletter Signup**

- [ ] **Email Collection**
  - [ ] Email added to database
  - [ ] Duplicate emails handled gracefully
  - [ ] Confirmation message shown
  - [ ] **Test**: Sign up newsletter → Check database → Verify email stored

- [ ] **Email Preferences**
  - [ ] Preferences page loads
  - [ ] Toggles save correctly
  - [ ] Changes persist after refresh
  - [ ] **Test**: Update preferences → Refresh → Verify saved

### **Unsubscribe System**

- [ ] **Unsubscribe Links**
  - [ ] Unsubscribe link in all emails works
  - [ ] User removed from email lists
  - [ ] Confirmation page displayed
  - [ ] Transactional emails still sent (order confirmations)
  - [ ] **Test**: Click unsubscribe → Verify preferences updated → Check still receives order emails

- [ ] **Email Preferences**
  - [ ] Individual email types can be toggled
  - [ ] Changes save correctly
  - [ ] **Test**: Toggle preferences → Verify emails respect settings

### **Social Share Buttons**

- [ ] **Share Functionality**
  - [ ] Facebook share works
  - [ ] Twitter/X share works
  - [ ] LinkedIn share works
  - [ ] WhatsApp share works (mobile)
  - [ ] Share URLs are correct
  - [ ] **Test**: Click each share button → Verify opens correct platform with correct URL

### **Comments/Feedback System**

- [ ] **Feedback Collection**
  - [ ] Star ratings submit correctly
  - [ ] Feedback saved to database
  - [ ] Thank you page displays
  - [ ] **Test**: Rate a guide → Verify feedback recorded → Check thank you page

### **Link Verification**

- [ ] **Internal Links**
  - [ ] All navigation links work
  - [ ] Footer links functional
  - [ ] Breadcrumb links work
  - [ ] No 404 errors
  - [ ] **Test**: Click all links → Verify no broken links

- [ ] **External Links**
  - [ ] Open in new tabs (`target="_blank"`)
  - [ ] Include `rel="noopener noreferrer"`
  - [ ] **Test**: Click external links → Verify new tab opens → Check security attributes

---

## 📧 **EMAIL AUTOMATION TESTS**

### **Welcome Email**

- [ ] **Trigger & Delivery**
  - [ ] Sends immediately upon signup
  - [ ] Email arrives within 2 minutes
  - [ ] **Test**: Sign up new user → Check email within 2 minutes

- [ ] **Email Content**
  - [ ] First name personalized correctly
  - [ ] CTA button links to correct page
  - [ ] Unsubscribe link present
  - [ ] **Test**: Open email → Verify personalization → Click CTA → Verify link works

### **Post-Guide Engagement Email**

- [ ] **Scheduling**
  - [ ] Email scheduled 2 hours after guide view
  - [ ] Email sent at correct time
  - [ ] **Test**: View guide → Wait 2 hours → Check email

- [ ] **Email Content**
  - [ ] Guide title included
  - [ ] Feedback buttons work
  - [ ] **Test**: Click feedback button → Verify feedback recorded

### **Feedback Request Email**

- [ ] **Scheduling**
  - [ ] Email scheduled 24 hours after interaction
  - [ ] Email sent at correct time
  - [ ] **Test**: View guide → Wait 24 hours → Check email

- [ ] **Rating System**
  - [ ] All 5 star ratings work
  - [ ] Ratings recorded correctly
  - [ ] Thank you page displays
  - [ ] **Test**: Click each star rating → Verify recorded → Check thank you page

### **Re-engagement Email**

- [ ] **Trigger**
  - [ ] Sends after 7 days of inactivity
  - [ ] New guides displayed
  - [ ] **Test**: Wait 7 days inactive → Check email → Verify new guides shown

### **Email Template Rendering**

- [ ] **Email Clients**
  - [ ] Gmail (desktop) renders correctly
  - [ ] Gmail (mobile app) renders correctly
  - [ ] Outlook (desktop) renders correctly
  - [ ] Outlook (web) renders correctly
  - [ ] Apple Mail renders correctly
  - [ ] **Test**: Send test email → Open in each client → Verify layout

- [ ] **Mobile Optimization**
  - [ ] Single column layout on mobile
  - [ ] Buttons are touch-friendly (44x44px)
  - [ ] Text is readable (16px+)
  - [ ] **Test**: Open email on mobile → Verify responsive design

### **Email Tracking**

- [ ] **Open Rates**
  - [ ] Tracking pixels load
  - [ ] Opens recorded in database/analytics
  - [ ] **Test**: Open email → Check tracking data

- [ ] **Click Tracking**
  - [ ] CTA clicks tracked
  - [ ] Link clicks recorded
  - [ ] **Test**: Click links in email → Verify tracking

### **Reply-to Monitoring**

- [ ] **Reply Address**
  - [ ] Reply-to set to monitored email
  - [ ] Replies received correctly
  - [ ] **Test**: Reply to email → Verify received at hello@hatchepk.com

---

## 🔍 **SEO VERIFICATION**

### **Google Search Console**

- [ ] **Setup**
  - [ ] Property added
  - [ ] Domain verified
  - [ ] Sitemap submitted
  - [ ] **Test**: Go to GSC → Verify property verified → Check sitemap status

- [ ] **Indexing**
  - [ ] Sitemap processed
  - [ ] Pages indexed
  - [ ] No crawl errors
  - [ ] **Test**: Check GSC → Coverage report → Verify pages indexed

### **Google Analytics 4**

- [ ] **Installation**
  - [ ] GA4 tracking code installed
  - [ ] Real-time data flowing
  - [ ] Events tracking correctly
  - [ ] **Test**: Visit site → Check GA4 real-time → Verify page views

- [ ] **Event Tracking**
  - [ ] Page views tracked
  - [ ] Button clicks tracked
  - [ ] Form submissions tracked
  - [ ] **Test**: Perform actions → Check GA4 events

### **Sitemap**

- [ ] **Sitemap.xml**
  - [ ] File exists at `/sitemap.xml`
  - [ ] All public pages included
  - [ ] Valid XML format
  - [ ] Submitted to GSC
  - [ ] **Test**: Visit `/sitemap.xml` → Verify format → Check GSC submission

### **Core Web Vitals**

- [ ] **PageSpeed Insights**
  - [ ] LCP < 2.5s
  - [ ] FID < 100ms
  - [ ] CLS < 0.1
  - [ ] **Test**: Run PageSpeed Insights → Verify all metrics pass

- [ ] **Mobile Performance**
  - [ ] Mobile score > 90
  - [ ] Mobile usability passes
  - [ ] **Test**: Test on mobile device → Check performance

### **Schema Markup**

- [ ] **Rich Results Test**
  - [ ] WebSite schema valid
  - [ ] ItemList schema valid
  - [ ] BreadcrumbList schema valid
  - [ ] **Test**: Use Google Rich Results Test → Verify all schemas valid

### **Mobile Usability**

- [ ] **Google Search Console**
  - [ ] Mobile usability test passes
  - [ ] No mobile usability errors
  - [ ] **Test**: Check GSC → Mobile Usability → Verify no errors

---

## ⚡ **PERFORMANCE TESTS**

### **Lighthouse Audit**

- [ ] **Performance Score**
  - [ ] Score > 90
  - [ ] **Test**: Run Lighthouse → Verify score

- [ ] **All Categories**
  - [ ] Performance > 90
  - [ ] Accessibility > 90
  - [ ] Best Practices > 90
  - [ ] SEO > 90
  - [ ] **Test**: Run full Lighthouse audit → Verify all scores

### **Network Performance**

- [ ] **Slow 3G Test**
  - [ ] Site loads on slow 3G
  - [ ] Critical content visible quickly
  - [ ] **Test**: Chrome DevTools → Network throttling → Slow 3G → Test load

- [ ] **Time to First Byte (TTFB)**
  - [ ] TTFB < 600ms
  - [ ] **Test**: Check Network tab → Verify TTFB

### **Image Optimization**

- [ ] **Image Compression**
  - [ ] Images compressed (< 200KB each)
  - [ ] WebP format used where possible
  - [ ] **Test**: Check image sizes → Verify compression

- [ ] **Image Dimensions**
  - [ ] Explicit width/height set
  - [ ] No layout shift
  - [ ] **Test**: Check images → Verify dimensions set

- [ ] **Lazy Loading**
  - [ ] Images lazy load
  - [ ] Above-fold images load immediately
  - [ ] **Test**: Scroll page → Verify lazy loading works

### **Console Errors**

- [ ] **Browser Console**
  - [ ] No JavaScript errors
  - [ ] No network errors
  - [ ] No CORS errors
  - [ ] **Test**: Open DevTools → Console → Verify no errors

- [ ] **Production Build**
  - [ ] Build completes successfully
  - [ ] No build warnings
  - [ ] **Test**: Run `npm run build` → Verify success

---

## 🧪 **AUTOMATED TESTING SCRIPTS**

Run these scripts to automate testing:

```bash
# Test all internal links
npm run test:links

# Test email endpoints
npm run test:emails

# Test API endpoints
npm run test:api

# Run Lighthouse audit
npm run test:lighthouse
```

---

## 📊 **TESTING REPORT TEMPLATE**

After completing tests, fill out:

**Date**: _______________
**Tester**: _______________
**Environment**: Production / Staging

**Summary**:
- Total Tests: ___
- Passed: ___
- Failed: ___
- Blockers: ___

**Issues Found**:
1. [Issue description] - [Severity: Critical/High/Medium/Low]
2. ...

**Ready for Launch**: Yes / No

---

## 🚨 **CRITICAL BLOCKERS**

These must pass before launch:

- [ ] All forms submit correctly
- [ ] Payment processing works
- [ ] Email delivery works
- [ ] No console errors
- [ ] Lighthouse Performance > 90
- [ ] Mobile responsive
- [ ] All critical links work
- [ ] Security headers configured
- [ ] SSL certificate valid
- [ ] Database backups configured

---

## ✅ **SIGN-OFF**

**Testing Completed By**: _______________
**Date**: _______________
**Approved for Launch**: Yes / No
**Sign-off**: _______________

---

**Next Steps After Testing**:
1. Fix any critical issues
2. Re-test fixed issues
3. Deploy to production
4. Monitor for 24 hours
5. Check analytics and error logs

