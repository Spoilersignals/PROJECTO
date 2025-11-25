export const getDeviceId = (): string => {
  const STORAGE_KEY = 'attendance_device_id';
  let deviceId = localStorage.getItem(STORAGE_KEY);
  
  if (!deviceId) {
    // Generate a random UUID-like string
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      deviceId = crypto.randomUUID();
    } else {
      // Fallback for older browsers
      deviceId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
      
    localStorage.setItem(STORAGE_KEY, deviceId);
  }
  
  return deviceId;
};

export const getDeviceName = (): string => {
  const userAgent = navigator.userAgent;
  let os = "Unknown OS";
  let deviceType = "";

  if (userAgent.indexOf("Win") !== -1) {
    os = "Windows";
    deviceType = "PC";
  } else if (userAgent.indexOf("Mac") !== -1) {
    os = "MacOS";
    if (userAgent.indexOf("iPhone") !== -1 || userAgent.indexOf("iPad") !== -1) {
      os = "iOS";
    }
  } else if (userAgent.indexOf("Linux") !== -1) {
    os = "Linux";
    if (userAgent.indexOf("Android") !== -1) {
      os = "Android";
    } else {
      deviceType = "PC"; // Linux Desktop
    }
  } else if (userAgent.indexOf("Android") !== -1) {
    os = "Android";
  } else if (userAgent.indexOf("like Mac") !== -1) {
    os = "iOS";
  }

  let browser = "Unknown Browser";
  if (userAgent.indexOf("Edg") !== -1) browser = "Edge";
  else if (userAgent.indexOf("Chrome") !== -1) browser = "Chrome";
  else if (userAgent.indexOf("Firefox") !== -1) browser = "Firefox";
  else if (userAgent.indexOf("Safari") !== -1 && userAgent.indexOf("Chrome") === -1) browser = "Safari";

  let model = "";
  
  // Try to parse Android model
  if (os === "Android") {
    const match = userAgent.match(/Android\s([0-9.]+);.*;\s([a-zA-Z0-9\s\-_]+)\sBuild/);
    if (match && match[2]) {
      model = match[2];
    }
  } 
  // Try to parse iPhone/iPad model (limited, usually just says "iPhone")
  else if (os === "iOS") {
    if (userAgent.indexOf("iPhone") !== -1) model = "iPhone";
    else if (userAgent.indexOf("iPad") !== -1) model = "iPad";
  }
  // Try to parse Mac model (very limited in modern browsers due to privacy)
  else if (os === "MacOS") {
    model = "Mac";
  }

  // Specific requirement: Show "PC" for Windows
  if (os === "Windows") {
    return `${browser} on Windows ${deviceType}`;
  }

  if (model) {
    return `${browser} on ${model} (${os})`;
  }

  return `${browser} on ${os}`;
};
