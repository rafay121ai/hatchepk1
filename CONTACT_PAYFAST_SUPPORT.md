# 📞 Contact PayFast Support - API Not Responding

## 🚨 **Issue Summary**

PayFast Production API `GetAccessToken` is **not responding** after 55+ seconds.

---

## 📧 **Email to PayFast Support**

**Send to**: merchantcare@payfast.co.za
**Subject**: URGENT - Production API GetAccessToken Not Responding (Merchant ID: 242347)

---

### **Email Template:**

```
Hi PayFast Support Team,

I am experiencing a critical issue with your Production API that is preventing customers from making payments.

MERCHANT DETAILS:
- Merchant ID: 242347
- Environment: PRODUCTION (ipg1.apps.net.pk)
- Issue Start Time: November 8, 2025, 15:30 UTC

API ENDPOINT ISSUE:
Endpoint: https://ipg1.apps.net.pk/Ecommerce/api/Transaction/GetAccessToken
Method: POST
Content-Type: application/x-www-form-urlencoded

REQUEST PARAMETERS:
- MERCHANT_ID: 242347
- SECURED_KEY: (provided, hidden in logs)
- BASKET_ID: ORDER-1762616256855-L9Y1XMGZ0
- TXNAMT: 5
- CURRENCY_CODE: PKR

ISSUE DETAILS:
The API call is timing out after 55 seconds with NO RESPONSE from your server. 
Our logs show:
- Request sent successfully at 15:37:38
- No response received after 55 seconds
- Timeout error at 15:38:33
- Error: "timeout of 55000ms exceeded"

Our backend is hosted on Vercel (US East - IAD1 region).
The same API was working previously but started failing today.

LOGS ATTACHED:
```
2025-11-08 15:37:38 [info] Calling PayFast API... {
  url: 'https://ipg1.apps.net.pk/Ecommerce/api/Transaction/GetAccessToken',
  merchantId: '242347',
  basketId: 'ORDER-1762616256855-L9Y1XMGZ0',
  amount: 5,
  currencyCode: 'PKR'
}
2025-11-08 15:38:33 [error] timeout of 55000ms exceeded
```

QUESTIONS:
1. Is there a known outage or maintenance on the production API?
2. Is there an alternative endpoint we should use?
3. Are there any rate limits or IP restrictions that might be causing this?
4. Is our merchant account properly configured for production API access?

This is blocking all customer payments. Please advise urgently.

Thank you,
Rafay Essani
Hatche (hatchepk.com)
essanirafay@gmail.com
Phone: 03311041066
```

---

## 📞 **Alternative Contact Methods:**

1. **Email**: merchantcare@payfast.co.za
2. **Email**: support@payfast.co.za  
3. **Phone**: (Check your PayFast welcome email for support number)
4. **WhatsApp**: (Check PayFast dashboard for WhatsApp support)

---

## 🔍 **What to Ask PayFast:**

1. **Is production API down?** (ipg1.apps.net.pk)
2. **Is our merchant account active?** (ID: 242347)
3. **Are there IP restrictions?** (Vercel uses dynamic IPs)
4. **Should we use a different endpoint?**
5. **Is there API maintenance happening?**

---

## ⏱️ **Expected Response Time:**

PayFast support typically responds within:
- Email: 4-24 hours
- Phone/WhatsApp: Immediate (if available)

---

**Send this email NOW to get help from PayFast!** 📧

