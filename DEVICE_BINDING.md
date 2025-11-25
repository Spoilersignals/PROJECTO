# Device Binding Security Feature

To prevent attendance fraud where one student logs in as another to mark attendance (impersonation), we have implemented **Device Binding**.

## How it works

1.  **Unique Device ID**: The frontend generates a unique ID for each browser/device and stores it in local storage.
2.  **Binding**: When a student marks attendance, this Device ID is sent to the backend.
3.  **Verification**: The backend checks if this Device ID has already been used to mark attendance for the *same session* by a *different student*.
4.  **Blocking**: If a match is found (meaning the device was already used), the request is blocked with a 403 error.

## Scenario Prevented

1.  Student A is absent.
2.  Student B is present.
3.  Student B marks their own attendance.
4.  Student B logs out and logs in as Student A on the same device.
5.  Student B tries to mark attendance for Student A.
6.  **System blocks the request**: "This device has already been used to mark attendance for this session."

## Limitations

-   A student can bypass this by using a different browser or incognito mode.
-   Clearing browser data resets the Device ID.
-   However, this adds significant friction and prevents the most common casual fraud (passing a phone around).
