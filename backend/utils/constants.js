// User roles
const USER_ROLES = {
  ADMIN: 'admin',
  LECTURER: 'lecturer',
  STUDENT: 'student'
};

// Session statuses
const SESSION_STATUSES = {
  SCHEDULED: 'scheduled',
  ACTIVE: 'active',
  ENDED: 'ended',
  CANCELLED: 'cancelled'
};

// Session types
const SESSION_TYPES = {
  LECTURE: 'lecture',
  TUTORIAL: 'tutorial',
  LAB: 'lab',
  SEMINAR: 'seminar',
  EXAM: 'exam'
};

// Attendance statuses
const ATTENDANCE_STATUSES = {
  PRESENT: 'present',
  LATE: 'late',
  EXCUSED: 'excused'
};

// Verification methods
const VERIFICATION_METHODS = {
  IP: 'ip',
  MANUAL: 'manual',
  OVERRIDE: 'override'
};

// Time constants (in milliseconds)
const TIME_CONSTANTS = {
  MINUTE: 60 * 1000,
  HOUR: 60 * 60 * 1000,
  DAY: 24 * 60 * 60 * 1000,
  WEEK: 7 * 24 * 60 * 60 * 1000
};

// Default settings
const DEFAULT_SETTINGS = {
  SESSION_DURATION_MINUTES: 120,
  ATTENDANCE_WINDOW_BUFFER_MINUTES: 15,
  LATE_ATTENDANCE_THRESHOLD_MINUTES: 15,
  MAX_SESSION_DURATION_HOURS: 8,
  PASSWORD_MIN_LENGTH: 8,
  MAX_REFRESH_TOKENS_PER_USER: 5
};

// Error messages
const ERROR_MESSAGES = {
  INVALID_CREDENTIALS: 'Invalid credentials provided',
  ACCESS_DENIED: 'Access denied. Insufficient permissions',
  TOKEN_EXPIRED: 'Authentication token has expired',
  INVALID_TOKEN: 'Invalid authentication token',
  USER_NOT_FOUND: 'User not found',
  SESSION_NOT_FOUND: 'Session not found',
  COURSE_NOT_FOUND: 'Course not found',
  INSTITUTION_NOT_FOUND: 'Institution not found',
  DUPLICATE_ENTRY: 'Resource already exists',
  VALIDATION_ERROR: 'Validation failed',
  SERVER_ERROR: 'Internal server error',
  RATE_LIMIT_EXCEEDED: 'Too many requests. Please try again later',
  IP_NOT_ALLOWED: 'Access denied. You must be connected to the institution Wi-Fi network',
  ATTENDANCE_WINDOW_CLOSED: 'Attendance window is closed',
  ATTENDANCE_ALREADY_MARKED: 'Attendance already marked for this session',
  SESSION_NOT_ACTIVE: 'Session is not currently active',
  NOT_ENROLLED: 'You are not enrolled in this course'
};

// Success messages
const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logged out successfully',
  REGISTRATION_SUCCESS: 'User registered successfully',
  ATTENDANCE_MARKED: 'Attendance marked successfully',
  SESSION_CREATED: 'Session created successfully',
  SESSION_STARTED: 'Session started successfully',
  SESSION_ENDED: 'Session ended successfully',
  COURSE_CREATED: 'Course created successfully',
  USER_UPDATED: 'User updated successfully',
  PASSWORD_CHANGED: 'Password changed successfully',
  TOKEN_REFRESHED: 'Token refreshed successfully'
};

// HTTP status codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500
};

// Regular expressions
const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
  COURSE_CODE: /^[A-Z]{2,4}\d{3,4}$/,
  INSTITUTION_CODE: /^[A-Z]{2,10}$/,
  ACADEMIC_YEAR: /^\d{4}\/\d{4}$/,
  TIME_FORMAT: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
  IP_RANGE: /^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/,
  PHONE: /^\+?[\d\s\-\(\)]{10,}$/
};

module.exports = {
  USER_ROLES,
  SESSION_STATUSES,
  SESSION_TYPES,
  ATTENDANCE_STATUSES,
  VERIFICATION_METHODS,
  TIME_CONSTANTS,
  DEFAULT_SETTINGS,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  HTTP_STATUS,
  REGEX_PATTERNS
};
