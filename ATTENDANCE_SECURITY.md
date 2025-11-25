# Attendance System Security Model

## How the System Prevents Cheating

The system uses **multi-layer verification** to ensure students are physically present in the classroom:

### 1. **IP Address Verification** (PRIMARY - Most Reliable)
- **How it works**: When a lecturer creates a session, the system captures their IP address and subnet
- **Security**: Students MUST be connected to the **same WiFi network** as the lecturer
- **Why it's secure**: 
  - IP addresses are assigned by the router and cannot be faked remotely
  - Students on mobile data or different WiFi networks will be blocked
  - Even if WiFi names match, different networks have different IP ranges

**Example**:
- Lecturer IP: `192.168.2.105`
- Allowed subnet: `192.168.2.0/24` (all devices from 192.168.2.1 to 192.168.2.254)
- Student on same WiFi: `192.168.2.143` ✅ ALLOWED
- Student on mobile data: `41.90.x.x` ❌ BLOCKED
- Student on home WiFi: `192.168.1.50` ❌ BLOCKED (different subnet)

### 2. **GPS Location Verification** (SECONDARY - Less Reliable on Mobile)
- **How it works**: Checks if student is within specified radius (default: 200 meters) of classroom
- **Limitation**: GPS on mobile networks uses cell towers, which can be 100-500m off
- **Current behavior**: 
  - Location is captured and logged for audit purposes
  - Distance warnings are logged but don't block attendance
  - IP verification is trusted more than GPS when they conflict

**Why GPS alone isn't enough**:
- Cell tower triangulation on mobile data can be very inaccurate
- WiFi-based GPS is more accurate but students might use mobile data
- A student could be 300m away due to GPS error but still in the classroom

### 3. **WiFi SSID Logging** (AUDIT TRAIL)
- **Current implementation**: WiFi network name is captured but not verified
- **Why**: SSID alone is not secure - it can be:
  - Spoofed (fake network with same name)
  - Duplicated (same SSID at multiple locations)
  - Changed easily

**SSID is useful for**:
- Audit trails (knowing which network was used)
- Detecting patterns of suspicious activity
- Additional data point for manual review

---

## Current Configuration

### For Best Security:
1. **Students MUST connect to classroom WiFi** - This is enforced ✅
2. **GPS is helpful but not required** - Mobile GPS is too unreliable ⚠️
3. **WiFi SSID is logged** - For audit purposes only ℹ️

### What Students See:
- If on mobile data: "You must be connected to the classroom network"
- If on different WiFi: "You must be connected to the classroom network"
- If on same WiFi but GPS shows far away: Attendance is allowed (IP verification passed)

---

## Addressing Your Concerns

### Q: "I'm on mobile network and it says class is too far"
**A**: The system now prioritizes IP verification over GPS. If you're connected to the classroom WiFi:
- Your attendance will be marked ✅
- GPS distance is logged but won't block you
- Connect to the classroom WiFi instead of using mobile data

### Q: "WiFi names can be the same - how do you verify?"
**A**: We don't rely on WiFi SSID for verification. Instead:
- **IP address ranges are unique** to each physical router
- Even if SSID is "Classroom WiFi" at 2 schools, their IP ranges are different:
  - School A: `192.168.2.0/24`
  - School B: `10.0.5.0/24`
- Students must be on the **exact same network** as the lecturer, not just same SSID name

---

## Recommendations for Deployment

### For Lecturers:
1. Always create sessions while connected to classroom WiFi
2. Set reasonable radius (50-200m depending on building size)
3. Review attendance logs for suspicious patterns

### For Students:
1. **Connect to classroom WiFi before marking attendance**
2. Enable location services (helps with audit trail)
3. Be physically present in the classroom

### For Administrators:
1. Use unique WiFi SSIDs per building/floor for easier auditing
2. Configure firewall to assign consistent IP ranges per classroom
3. Review attendance logs regularly for patterns (e.g., multiple students same IP could indicate one person marking for others)

---

## Future Enhancements (Optional)

1. **BSSID (Router MAC Address) Verification**: More secure than SSID, harder to spoof
2. **Bluetooth Beacon**: Lecturer's device broadcasts, students must detect it
3. **Face Recognition**: Biometric verification via webcam
4. **QR Code Rotation**: Time-based codes displayed in classroom
5. **Network Latency Analysis**: Detect VPN/proxy users
