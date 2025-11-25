# System Architecture

## Directory Structure

### Backend (`/backend`)
- **`routes/`**: API route handlers
  - `attendance.js`: Core attendance logic (marking, checking, reporting)
  - `auth.js`: User authentication (login, register)
  - `sessions.js`: Session management
  - `courses.js`: Course management
  - `users.js`: User management
- **`models/`**: MongoDB Mongoose models (Attendance, Session, Course, User)
- **`middleware/`**: Custom middleware
  - `auth.js`: JWT verification
  - `validation.js`: Input validation
  - `ipVerification.js`: IP range checking logic
- **`utils/`**: Helper functions (constants, email service)

### Frontend (`/frontend`)
- React.js based Single Page Application (SPA)
- **`src/components/`**: UI Components
  - `lecturer/`: Dashboard and session creation
  - `student/`: Dashboard and attendance marking
  - `admin/`: System administration
- Uses `workbox` for PWA capabilities (offline support basics)

## Data Flow: Marking Attendance

1.  **Session Creation (Lecturer)**
    -   Lecturer creates a session with a defined time window (e.g., 5 mins).
    -   System records Lecturer's current IP and WiFi SSID as the "source of truth".

2.  **Student Check-In (Student)**
    -   Student logs in and selects the active session.
    -   **Client-Side Check**: App checks if device is online and gets current location/network info.
    -   **Request**: `POST /api/attendance/:sessionId` with `wifiSSID`, `location`, `notes`.

3.  **Server-Side Verification (Backend)**
    -   **Auth Check**: Verify JWT token (Is user a student?).
    -   **Enrollment Check**: Is student enrolled in this course?
    -   **Time Check**: Is session active and within window?
    -   **SSID Verification**: Does `req.body.wifiSSID` match session's expected SSID?
    -   **IP Verification**: Does `req.clientIp` match the allowed IP ranges?
    -   **Location Check**: (Optional) Is distance < `allowedRadius`?
    -   **Duplicate Check**: Has student already marked attendance?

4.  **Result**
    -   **Success**: Record saved, status "present". Response `201 Created`.
    -   **Failure**: Record not saved. Response `403 Forbidden` with specific error message (e.g., "Wrong WiFi").

## Security Layers

| Layer | Threat Mitigated | Mechanism |
| :--- | :--- | :--- |
| **Authentication** | Unauthorized access | JWT (JSON Web Tokens) |
| **Session Expiry** | Late marking | Server-side timestamp validation |
| **IP Verification** | Remote marking (home) | `ip-range-check` against subnet |
| **SSID Verification** | Wrong network | String comparison of WiFi name |
| **Location (GPS)** | Remote marking | Haversine distance calculation |
| **Device Fingerprint** | Device sharing | Logging User-Agent & Platform |
