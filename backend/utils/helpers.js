const jwt = require('jsonwebtoken');
const { TIME_CONSTANTS } = require('./constants');

/**
 * Generate a random string of specified length
 */
const generateRandomString = (length = 32) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Format date to readable string
 */
const formatDate = (date, options = {}) => {
  const defaultOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options
  };
  return new Date(date).toLocaleString('en-US', defaultOptions);
};

/**
 * Calculate time difference in human readable format
 */
const getTimeDifference = (startTime, endTime = new Date()) => {
  const diff = Math.abs(endTime - startTime);
  const minutes = Math.floor(diff / TIME_CONSTANTS.MINUTE);
  const hours = Math.floor(diff / TIME_CONSTANTS.HOUR);
  const days = Math.floor(diff / TIME_CONSTANTS.DAY);

  if (days > 0) {
    return `${days} day${days !== 1 ? 's' : ''} ago`;
  } else if (hours > 0) {
    return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  } else {
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  }
};

/**
 * Validate if date is within a time window
 */
const isWithinTimeWindow = (targetDate, startTime, endTime) => {
  const target = new Date(targetDate);
  const start = new Date(startTime);
  const end = new Date(endTime);
  
  return target >= start && target <= end;
};

/**
 * Generate JWT token with custom payload
 */
const generateJWT = (payload, secret, expiresIn = '1h') => {
  return jwt.sign(payload, secret, { expiresIn });
};

/**
 * Verify and decode JWT token
 */
const verifyJWT = (token, secret) => {
  try {
    return jwt.verify(token, secret);
  } catch (error) {
    throw new Error(`Invalid token: ${error.message}`);
  }
};

/**
 * Sanitize user input to prevent XSS
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .trim(); // Remove leading/trailing spaces
};

/**
 * Generate attendance statistics
 */
const calculateAttendanceStats = (attendanceRecords, totalSessions = 0) => {
  const total = attendanceRecords.length;
  const present = attendanceRecords.filter(record => record.status === 'present').length;
  const late = attendanceRecords.filter(record => record.status === 'late').length;
  const excused = attendanceRecords.filter(record => record.status === 'excused').length;
  
  const attendanceRate = totalSessions > 0 ? (total / totalSessions) * 100 : 0;
  const punctualityRate = total > 0 ? (present / total) * 100 : 0;
  
  return {
    total,
    present,
    late,
    excused,
    attendanceRate: Math.round(attendanceRate * 100) / 100,
    punctualityRate: Math.round(punctualityRate * 100) / 100,
    averageMinutesLate: late > 0 ? 
      attendanceRecords
        .filter(record => record.isLate)
        .reduce((sum, record) => sum + record.minutesLate, 0) / late : 0
  };
};

/**
 * Validate IP address format
 */
const isValidIP = (ip) => {
  const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return ipRegex.test(ip);
};

/**
 * Format file size in human readable format
 */
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Generate academic year string based on current date
 */
const getCurrentAcademicYear = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-based month
  
  // Assuming academic year starts in September (month 8)
  if (currentMonth >= 8) { // September onwards
    return `${currentYear}/${currentYear + 1}`;
  } else { // January to August
    return `${currentYear - 1}/${currentYear}`;
  }
};

/**
 * Parse query parameters for filtering
 */
const parseQueryFilters = (query, allowedFilters = []) => {
  const filters = {};
  
  allowedFilters.forEach(filter => {
    if (query[filter] !== undefined) {
      filters[filter] = query[filter];
    }
  });
  
  return filters;
};

/**
 * Create pagination metadata
 */
const createPaginationMeta = (page, limit, total) => {
  const currentPage = parseInt(page);
  const itemsPerPage = parseInt(limit);
  const totalPages = Math.ceil(total / itemsPerPage);
  const hasNext = currentPage < totalPages;
  const hasPrev = currentPage > 1;
  
  return {
    currentPage,
    totalPages,
    totalItems: total,
    itemsPerPage,
    hasNext,
    hasPrev
  };
};

/**
 * Validate and normalize email address
 */
const normalizeEmail = (email) => {
  if (typeof email !== 'string') return null;
  
  const normalized = email.toLowerCase().trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  return emailRegex.test(normalized) ? normalized : null;
};

/**
 * Generate session access code
 */
const generateSessionCode = () => {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Check if string contains only allowed characters
 */
const isValidInput = (input, pattern = /^[a-zA-Z0-9\s\-_.,()]+$/) => {
  return pattern.test(input);
};

/**
 * Deep clone object (simple implementation)
 */
const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj);
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  
  const cloned = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      cloned[key] = deepClone(obj[key]);
    }
  }
  return cloned;
};

/**
 * Create standardized API response
 */
const createResponse = (success, message, data = null, errors = null) => {
  const response = { success, message };
  
  if (data !== null) response.data = data;
  if (errors !== null) response.errors = errors;
  
  return response;
};

/**
 * Log request information for debugging
 */
const logRequest = (req, includeBody = false) => {
  const logData = {
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  };
  
  if (includeBody && req.body) {
    logData.body = req.body;
  }
  
  console.log('Request:', JSON.stringify(logData, null, 2));
};

module.exports = {
  generateRandomString,
  formatDate,
  getTimeDifference,
  isWithinTimeWindow,
  generateJWT,
  verifyJWT,
  sanitizeInput,
  calculateAttendanceStats,
  isValidIP,
  formatFileSize,
  getCurrentAcademicYear,
  parseQueryFilters,
  createPaginationMeta,
  normalizeEmail,
  generateSessionCode,
  isValidInput,
  deepClone,
  createResponse,
  logRequest
};
