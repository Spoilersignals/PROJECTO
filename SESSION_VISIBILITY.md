# Session Visibility & Network Security

## Current Behavior

### ✅ What Students CAN Do (Without Classroom WiFi):
1. **See active sessions** - All students can view which sessions are currently active
2. **See session details** - Course name, session name, expiry time
3. **Attempt to mark attendance** - They can click the button

### ❌ What Students CANNOT Do (Without Classroom WiFi):
1. **Actually mark attendance** - The server will reject them with:
   - Error: "You must be connected to the classroom network to mark attendance"
   - This check happens on the server, not the client
   - IP verification is MANDATORY and cannot be bypassed

---

## Security Analysis

### Current Design (Transparent Sessions):
**Pros:**
- ✅ Students can see what classes are happening (transparency)
- ✅ Students can plan ahead (know if they need to be present)
- ✅ Error messages are clear ("connect to classroom WiFi")
- ✅ Cannot be bypassed - server enforces IP verification

**Cons:**
- ⚠️ Students know sessions exist even when not in classroom
- ⚠️ Could attempt denial-of-service by spamming attendance requests (mitigated by rate limiting)

### Alternative Design (Hidden Sessions):
**Pros:**
- 🔒 Only students on classroom network can see sessions
- 🔒 Security through obscurity (less information leak)

**Cons:**
- ❌ Students can't see what's happening without being there
- ❌ Not actually more secure (just hidden)
- ❌ Poor user experience (students don't know if they should connect)

---

## Recommendation: Keep Current Design

**Reason:** The current design is **more secure AND more user-friendly** because:

1. **IP verification is the real security** - Hiding sessions doesn't add meaningful security
2. **Transparency is good** - Students should know when attendance is being taken
3. **Clear error messages** - Students understand WHY they can't mark attendance
4. **Cannot be bypassed** - Server-side verification is mandatory

---

## How It Actually Works

### Scenario 1: Student on Mobile Data
```
Student sees: "CS101 - Lecture 1 (Active)"
Student clicks: "Mark Attendance"
Server checks: IP = 41.90.x.x (mobile carrier)
Allowed IPs: 192.168.2.0/24 (classroom WiFi)
Result: ❌ BLOCKED - "You must be connected to the classroom network"
```

### Scenario 2: Student on Home WiFi
```
Student sees: "CS101 - Lecture 1 (Active)"
Student clicks: "Mark Attendance"
Server checks: IP = 192.168.1.50 (home network)
Allowed IPs: 192.168.2.0/24 (classroom WiFi)
Result: ❌ BLOCKED - "You must be connected to the classroom network"
```

### Scenario 3: Student on Classroom WiFi
```
Student sees: "CS101 - Lecture 1 (Active)"
Student clicks: "Mark Attendance"
Server checks: IP = 192.168.2.143 (classroom network)
Allowed IPs: 192.168.2.0/24 (classroom WiFi)
GPS check: Within 200m of classroom
Result: ✅ ALLOWED - Attendance marked successfully
```

---

## If You Want to Hide Sessions (Optional)

If you prefer that students only see sessions when on the classroom network, I can add this feature. However, it would work like this:

### Option A: Client-side filtering (Not Secure)
- Frontend hides sessions based on network
- Students with technical knowledge can bypass
- **Not recommended**

### Option B: Server-side filtering (Secure but Complex)
- Backend checks student's IP before returning sessions
- Only returns sessions if student is on matching network
- **Adds complexity without real security benefit**

### Option C: Hybrid (Best of Both)
- Show all sessions to everyone (current)
- Clearly indicate which sessions they can join:
  - ✅ "Available - You're on the correct network"
  - ⚠️ "Not Available - Connect to classroom WiFi"
- **Better UX without compromising security**

---

## My Recommendation: Option C

Let's improve the UI to show students which sessions they can actually join, while keeping them visible for transparency.

Would you like me to implement this?
