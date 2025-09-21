export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

export const ROLES = {
  STUDENT: 'student',
  LECTURER: 'lecturer',
  ADMIN: 'admin',
} as const;

export const ATTENDANCE_STATUS = {
  PRESENT: 'present',
  LATE: 'late',
  ABSENT: 'absent',
} as const;

export const LOCAL_STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
  THEME: 'theme',
} as const;

export const GEOLOCATION_OPTIONS = {
  enableHighAccuracy: true,
  timeout: 15000,
  maximumAge: 300000, // 5 minutes
};

export const DEFAULT_SESSION_DURATION = 2; // hours
export const MIN_ALLOWED_RADIUS = 10; // meters
export const MAX_ALLOWED_RADIUS = 500; // meters

export const COLORS = {
  PRIMARY: '#3b82f6',
  SECONDARY: '#22c55e',
  DANGER: '#ef4444',
  WARNING: '#f59e0b',
  INFO: '#06b6d4',
  SUCCESS: '#22c55e',
} as const;

export const BREAKPOINTS = {
  SM: '640px',
  MD: '768px',
  LG: '1024px',
  XL: '1280px',
  '2XL': '1536px',
} as const;

export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  FORBIDDEN: 'Access denied.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  GEOLOCATION_DENIED: 'Location access is required for attendance marking.',
  GEOLOCATION_UNAVAILABLE: 'Location services are not available.',
  GEOLOCATION_TIMEOUT: 'Location request timed out. Please try again.',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
} as const;

export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Successfully logged in!',
  REGISTER_SUCCESS: 'Account created successfully!',
  ATTENDANCE_MARKED: 'Attendance marked successfully!',
  SESSION_CREATED: 'Attendance session created successfully!',
  SESSION_UPDATED: 'Session updated successfully!',
  SESSION_DELETED: 'Session deleted successfully!',
} as const;
