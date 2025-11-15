# 🔧 Session Management Fix - Mobile Tab Close Issue

## 🐛 **Problems Identified**

### **Problem 1: Sign Out on Tab Close**
- When user closes tab on mobile, they get signed out
- When they sign back in, system shows "already 2 active users" error
- Same device was being counted as multiple devices

### **Problem 2: Unstable Device Fingerprinting**
- Device ID was generated fresh each time (not persisted)
- Same device got different device IDs on each session
- Caused false "too many devices" errors

### **Problem 3: Session Cleanup Issues**
- Sessions not properly cleaned up on tab close
- Old sessions from same device not removed
- Concurrent session check counted same device multiple times

### **Problem 4: Influencer Access**
- Similar issues with device fingerprinting
- Session management not consistent

---

## ✅ **Fixes Applied**

### **1. Stable Device Fingerprinting**

**Before:**
```javascript
const generateDeviceFingerprint = () => {
  return btoa(JSON.stringify({
    ua: navigator.userAgent,
    screen: `${window.screen.width}x${window.screen.height}`
  })).substring(0, 100);
};
// ❌ New ID every time - same device gets different IDs
```

**After:**
```javascript
const generateDeviceFingerprint = useCallback(() => {
  // Check localStorage for existing device ID
  let deviceId = localStorage.getItem('hatche_device_id');
  
  if (!deviceId) {
    // Generate new stable ID and store it
    deviceId = `device_${fingerprint}_${Date.now()}`;
    localStorage.setItem('hatche_device_id', deviceId);
  }
  
  return deviceId; // ✅ Same ID every time for same device
}, []);
```

**Result:**
- ✅ Same device always gets same device ID
- ✅ Persists across browser sessions
- ✅ Survives tab close/reopen

---

### **2. Improved Concurrent Session Check**

**Before:**
```javascript
const checkConcurrentSessions = async (gId, usr, deviceId) => {
  // Get all active sessions
  const sessions = await getSessions();
  
  // Count devices (excluding current)
  const devices = new Set();
  sessions.forEach(s => { 
    if (s.device_id !== deviceId) devices.add(s.device_id); 
  });
  
  return devices.size < 2;
  // ❌ Doesn't clean up old sessions from same device
};
```

**After:**
```javascript
const checkConcurrentSessions = async (gId, usr, deviceId) => {
  // 1. Clean up stale sessions (older than 2 minutes)
  await deleteStaleSessions();
  
  // 2. Remove old sessions from SAME device_id
  // ✅ This ensures same device replaces old session, not adds new one
  await deleteSessionsFromDevice(deviceId);
  
  // 3. Count OTHER devices only
  const otherDevices = countOtherDevices(deviceId);
  
  return otherDevices < 2; // ✅ Only counts OTHER devices
};
```

**Result:**
- ✅ Same device replaces old session (doesn't count as new device)
- ✅ Only counts OTHER devices for limit check
- ✅ Stale sessions automatically cleaned up

---

### **3. Tab Close & Visibility Handling**

**Added Event Listeners:**

```javascript
// Handle tab close
const handleBeforeUnload = () => {
  if (sessionIdRef.current) {
    closeSession(sessionIdRef.current); // Cleanup on close
  }
};

// Handle tab switch/minimize
const handleVisibilityChange = () => {
  if (document.hidden) {
    // Pause heartbeat when tab hidden
    clearInterval(heartbeatRef.current);
  } else {
    // Resume heartbeat when tab visible
    resumeHeartbeat();
  }
};

window.addEventListener('beforeunload', handleBeforeUnload);
document.addEventListener('visibilitychange', handleVisibilityChange);
```

**Result:**
- ✅ Sessions cleaned up on tab close
- ✅ Heartbeat pauses when tab hidden (saves resources)
- ✅ Heartbeat resumes when tab visible
- ✅ Proper cleanup on component unmount

---

### **4. Session Cleanup Logic**

**Improved cleanup:**
```javascript
const cleanup = () => {
  // Clear heartbeat
  if (heartbeatRef.current) {
    clearInterval(heartbeatRef.current);
    heartbeatRef.current = null;
  }
  
  // Close session in database
  if (sessionIdRef.current) {
    closeSession(sessionIdRef.current);
    sessionIdRef.current = null;
  }
};
```

**Result:**
- ✅ Proper cleanup on unmount
- ✅ No memory leaks
- ✅ Sessions properly closed in database

---

### **5. Influencer Access Consistency**

**Updated:**
- Uses same stable device fingerprint utility
- Device ID persists across sessions
- Consistent session management

---

## 🎯 **How It Works Now**

### **Scenario 1: User Closes Tab and Reopens**

1. **Tab Close:**
   - `beforeunload` event fires
   - Session is closed in database
   - Device ID remains in localStorage

2. **User Reopens Tab:**
   - Same device ID retrieved from localStorage
   - Old session from same device is removed
   - New session created
   - ✅ No "too many devices" error

### **Scenario 2: User Switches Tabs**

1. **Tab Hidden:**
   - Heartbeat pauses (saves resources)
   - Session remains active

2. **Tab Visible:**
   - Heartbeat resumes
   - Immediate heartbeat sent
   - ✅ Session stays active

### **Scenario 3: Multiple Devices**

1. **Device 1 Opens Guide:**
   - Session created with device_id_1
   - ✅ Allowed (0 other devices)

2. **Device 2 Opens Guide:**
   - Session created with device_id_2
   - ✅ Allowed (1 other device)

3. **Device 3 Opens Guide:**
   - Session created with device_id_3
   - ❌ Blocked (2 other devices already active)

4. **Device 1 Reopens:**
   - Old session from device_id_1 removed
   - New session created with device_id_1
   - ✅ Allowed (only 1 other device active)

---

## 📊 **Database Changes**

### **active_sessions Table:**

The cleanup now:
1. **Removes stale sessions** (older than 2 minutes)
2. **Removes old sessions from same device** (before creating new one)
3. **Only counts OTHER devices** for limit check

**Example:**
```
Before fix:
- device_1_session_old (stale)
- device_1_session_new (current)
- device_2_session
- device_3_session
→ Counts as 3 devices ❌

After fix:
- device_1_session_old → DELETED (same device)
- device_1_session_new (current)
- device_2_session
- device_3_session
→ Counts as 2 OTHER devices ✅
```

---

## ✅ **Testing Checklist**

### **Test 1: Tab Close/Reopen**
- [ ] Open guide on mobile
- [ ] Close tab
- [ ] Reopen tab and sign in
- [ ] Open same guide
- [ ] ✅ Should work (no "too many devices" error)

### **Test 2: Multiple Tabs Same Device**
- [ ] Open guide in tab 1
- [ ] Open guide in tab 2 (same device)
- [ ] ✅ Should work (replaces old session)

### **Test 3: Multiple Devices**
- [ ] Open guide on device 1
- [ ] Open guide on device 2
- [ ] Open guide on device 3
- [ ] ✅ Device 3 should be blocked (2 device limit)

### **Test 4: Tab Switch**
- [ ] Open guide
- [ ] Switch to another tab
- [ ] Wait 1 minute
- [ ] Switch back
- [ ] ✅ Guide should still be accessible

### **Test 5: Influencer Access**
- [ ] Enter influencer code
- [ ] Close tab
- [ ] Reopen and access guide
- [ ] ✅ Should work (same device recognized)

---

## 🔍 **Key Improvements**

1. **Stable Device IDs**: Same device always gets same ID
2. **Smart Session Replacement**: Same device replaces old session
3. **Proper Cleanup**: Sessions cleaned up on tab close
4. **Visibility Handling**: Heartbeat pauses/resumes based on tab visibility
5. **Consistent Logic**: Same logic for regular and influencer access

---

## 📝 **Notes**

- Device ID stored in `localStorage` as `hatche_device_id`
- Sessions auto-cleanup after 2 minutes of inactivity
- Maximum 2 concurrent devices (excluding current device)
- Same device can always reopen (replaces old session)

---

## 🎉 **Status**

✅ **Fixed**: Session management now properly handles tab close/reopen  
✅ **Fixed**: Same device recognized across sessions  
✅ **Fixed**: Concurrent session check only counts OTHER devices  
✅ **Fixed**: Proper cleanup on tab close  
✅ **Fixed**: Influencer access uses same stable device ID

**Ready for testing!**

