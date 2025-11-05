# iPhone Testing Guide - Clear Cache & See Debug Colors

## Current Debug Colors

Your menu now has **bright, impossible-to-miss colors**:

- **Menu Background**: Dark gray/black (#1a1a1a)
- **Menu Buttons**: BRIGHT GREEN (#00ff00) with RED borders (#ff0000)
- **User Icon Button**: BLUE (#0000ff) with YELLOW text
- **Text**: BLACK (#000000)

If you don't see these colors on your iPhone, your browser is **caching the old CSS**.

---

## 🧹 **STEP 1: CLEAR CACHE ON IPHONE**

### Method 1: Hard Refresh in Safari
1. Open Safari on iPhone
2. Go to `https://hatchepk.com`
3. Tap the **AA** button in address bar
4. Tap **"Reload Without Content Blockers"**
5. OR tap and HOLD the refresh button for 2 seconds

### Method 2: Clear All Safari Cache
1. Go to iPhone **Settings**
2. Scroll to **Safari**
3. Scroll down and tap **"Clear History and Website Data"**
4. Confirm
5. Reopen Safari and go to `https://hatchepk.com`

### Method 3: Force Refresh (Best)
1. Open Safari on iPhone
2. Go to `https://hatchepk.com`
3. Pull down on the page to reveal address bar
4. Tap and HOLD the refresh icon for 2-3 seconds
5. Select "Reload Without Content Blockers"

---

## ✅ **STEP 2: WHAT YOU SHOULD SEE**

After clearing cache, when you tap the hamburger:

### On Menu Open:
- **Background**: DARK GRAY/BLACK (not beige!)
- **Buttons**:
  - ✅ "Home" - BRIGHT GREEN button with RED border
  - ✅ "Our Guides" - BRIGHT GREEN with RED border
  - ✅ "Your Guides" - BRIGHT GREEN with RED border
  - ✅ "Affiliate Program" - BRIGHT GREEN with RED border
  - ✅ "About Us" - BRIGHT GREEN with RED border
- **User Button**: BLUE with white/yellow icon
- **Text**: BLACK (very readable)

---

## 🚨 **IF YOU STILL SEE NOTHING:**

Try in **Private/Incognito Mode**:

### Safari Private Mode:
1. Open Safari
2. Tap the **tabs button** (bottom right)
3. Tap **"Private"** (bottom left)
4. Tap **+** to open new private tab
5. Go to `https://hatchepk.com`
6. Test the hamburger menu

### Chrome Incognito:
1. Open Chrome on iPhone
2. Tap **...** (three dots)
3. Tap **"New Incognito Tab"**
4. Go to `https://hatchepk.com`
5. Test menu

---

## 📊 **WHAT TO REPORT BACK:**

After clearing cache, tell me:

1. **Do you see the DARK background?** (Yes/No)
2. **Do you see BRIGHT GREEN buttons?** (Yes/No)
3. **Do you see RED borders?** (Yes/No)
4. **Do you see the BLUE user icon button?** (Yes/No)

If YES to all → Elements ARE rendering, we just need to adjust colors back to your design.

If NO to any → We have a deeper iOS Safari rendering bug to investigate.

---

## 🔧 **ALTERNATIVE: Test Locally**

If cache issues persist, test on your local network:

1. On your Mac, run:
```bash
npm start
```

2. Note your Mac's IP (from terminal or System Preferences → Network)

3. On your iPhone (connected to **SAME WiFi**), go to:
```
http://YOUR_MAC_IP:3000
```

Example: `http://192.168.100.53:3000`

This bypasses all caching and shows the latest code immediately.

---

## 📝 **CHECKLIST:**

- [ ] Cleared Safari cache on iPhone
- [ ] Tried hard refresh
- [ ] Tested in Private/Incognito mode
- [ ] Checked if Vercel deployment succeeded
- [ ] Verified WiFi connection
- [ ] Tried Chrome mobile (not just Safari)

---

**Once you confirm you can see the bright colors, we'll change them back to your beautiful design with proper contrast!** 🎨

