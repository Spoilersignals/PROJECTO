# Smart Wi-Fi Bound Prompt-Based Class Attendance System
## Project Report

### 1. Executive Summary

In many academic settings, traditional class attendance methods such as manual roll calls are inefficient, time-consuming, and susceptible to misuse—especially proxy attendance. Advanced alternatives like biometric systems are expensive and impractical for resource-constrained institutions or large class sizes.

This project introduces a smartphone-based attendance system that leverages the institution’s Wi-Fi infrastructure to confirm student presence in class. By generating a time-limited attendance prompt, only students physically connected to the authorized Wi-Fi network can mark themselves present, ensuring a location-bound, hardware-free, and efficient attendance-taking process.

### 2. Objectives

- **Secure Attendance**: To ensure attendance marking is bound to physical class presence using Wi-Fi verification (IP and SSID).
- **Accessibility**: To develop a secure and easy-to-use attendance system accessible via student smartphones.
- **Automation**: To automate attendance reporting and reduce administrative workload.
- **Integrity**: To prevent proxy submissions and promote academic integrity.

### 3. Key Actors and Roles

#### Lecturer
- Initiates attendance sessions for specific classes.
- Downloads or views attendance reports in real time.
- Defines the required Wi-Fi network for the session.

#### Student
- Connects to the institution Wi-Fi and marks attendance using their registration number during a valid session.
- Must be physically present and connected to the correct network.

#### Administrator
- Manages accounts, monitors logs, manages course-session associations, and ensures data integrity.

### 4. Functional Requirements

#### User Registration and Role Assignment
- Secure sign-up/login using email or institutional credentials.
- Roles include student, lecturer, and admin.

#### Prompt Generation and Expiry
- Lecturer creates a one-time attendance prompt tied to a class session.
- Prompt expires automatically after a set time (e.g., 2-3 minutes).

#### Wi-Fi & Location Verification (Security Core)
- **SSID Verification**: System verifies the student is connected to the specific Wi-Fi network named by the lecturer.
- **IP Range Verification**: System verifies the IP address matches the institutional network range.
- **Location Verification**: Optional GPS check to ensure proximity to the classroom.

#### Attendance Logging
- Students submit registration number once per session.
- System logs timestamp, session ID, IP address, SSID, and status.
- Duplicate prevention ensures one response per student.

#### Report Generation
- Admin and lecturers can export attendance data by date, session, or student (PDF/Excel).

### 5. Technical Architecture

#### Technology Stack
- **Frontend**: React.js (Responsive Web App)
- **Backend**: Node.js (Express)
- **Database**: MongoDB (Flexible schema for attendance logs)
- **Authentication**: JWT-based secure authentication
- **Deployment**: Cloud-ready (AWS/Heroku compatible)

#### Security Model
The system employs a multi-layer security approach:
1.  **WiFi SSID Verification**: Ensures the student is connected to the correct network name.
2.  **IP Address Verification**: Ensures the student is on the institution's subnet (harder to spoof than SSID).
3.  **GPS Location**: Secondary verification to ensure physical proximity (with tolerance for mobile GPS drift).
4.  **Session Locking**: Time-limited windows (2-3 mins) prevent late or remote submissions.

### 6. Recent Improvements

Recent updates have significantly enhanced the security and usability of the system:

-   **Enhanced SSID Verification**: Added explicit checks for WiFi network names to prevent "same router, different network" attacks.
-   **Student UI Updates**: Students now see the required WiFi network name and must confirm their connection.
-   **Lecturer Dashboard**: Improved instructions for lecturers to identify and input the correct WiFi SSID.
-   **Error Messaging**: Clearer error messages when students are on the wrong network or using mobile data.

### 7. Project Delivery Requirements

-   **Institutional Wi-Fi**: Requires identifiable IP address ranges.
-   **Hosting**: Cloud-based hosting environment (e.g., Heroku, AWS).
-   **Domain**: SSL certificate for secure HTTPS transmission.
-   **Devices**: Accessible via standard smartphones and laptops.

### 8. Conclusion

The Smart Wi-Fi Bound Attendance System provides a robust, cost-effective solution to academic attendance challenges. By leveraging existing infrastructure (Wi-Fi) and personal devices (smartphones), it eliminates the need for specialized hardware while significantly raising the bar against proxy attendance through multi-factor verification (IP, SSID, Location, Time).
