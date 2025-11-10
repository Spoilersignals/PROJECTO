const { body, param, query, validationResult } = require('express-validator');
const mongoose = require('mongoose');

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

// User validation rules
const validateUserRegistration = [
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  
  body('role')
    .isIn(['student', 'lecturer', 'admin'])
    .withMessage('Role must be student, lecturer, or admin'),
  
  body('registrationNumber')
    .if(body('role').equals('student'))
    .notEmpty()
    .trim()
    .withMessage('Registration number is required for students'),
  
  body('employeeId')
    .if(body('role').equals('lecturer'))
    .notEmpty()
    .trim()
    .withMessage('Employee ID is required for lecturers'),
  
  body('institution')
    .optional()
    .isMongoId()
    .withMessage('Please provide a valid institution ID'),
  
  handleValidationErrors
];

const validateLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidationErrors
];

// Session validation rules
const validateSessionCreation = [
  body('courseId')
    .isMongoId()
    .withMessage('Please provide a valid course ID'),
  
  body('title')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Session title must be between 3 and 100 characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  
  body('sessionType')
    .isIn(['lecture', 'tutorial', 'lab', 'seminar', 'exam'])
    .withMessage('Invalid session type'),
  
  body('location')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Location must be between 2 and 100 characters'),
  
  body('startTime')
    .isISO8601()
    .withMessage('Please provide a valid start time'),
  
  body('endTime')
    .isISO8601()
    .withMessage('Please provide a valid end time')
    .custom((endTime, { req }) => {
      if (new Date(endTime) <= new Date(req.body.startTime)) {
        throw new Error('End time must be after start time');
      }
      return true;
    }),
  
  body('attendanceWindowStart')
    .isISO8601()
    .withMessage('Please provide a valid attendance window start time'),
  
  body('attendanceWindowEnd')
    .isISO8601()
    .withMessage('Please provide a valid attendance window end time'),
  
  body('allowedIpRanges')
    .isArray({ min: 1 })
    .withMessage('At least one IP range must be provided'),
  
  body('allowedIpRanges.*')
    .matches(/^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/)
    .withMessage('Invalid IP range format'),
  
  handleValidationErrors
];

// Course validation rules
const validateCourseCreation = [
  body('name')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Course name must be between 3 and 100 characters'),
  
  body('code')
    .trim()
    .matches(/^[A-Z]{2,4}\d{3,4}$/)
    .withMessage('Course code must be in format like CS101 or MATH2001'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Description cannot exceed 1000 characters'),
  
  body('lecturerId')
    .isMongoId()
    .withMessage('Please provide a valid lecturer ID'),
  
  body('credits')
    .isInt({ min: 1, max: 6 })
    .withMessage('Credits must be between 1 and 6'),
  
  body('semester')
    .trim()
    .isLength({ min: 1, max: 20 })
    .withMessage('Semester is required'),
  
  body('academicYear')
    .matches(/^\d{4}\/\d{4}$/)
    .withMessage('Academic year must be in format 2023/2024'),
  
  handleValidationErrors
];

// Institution validation rules
const validateInstitutionCreation = [
  body('name')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Institution name must be between 3 and 100 characters'),
  
  body('code')
    .trim()
    .matches(/^[A-Z]{2,10}$/)
    .withMessage('Institution code must be 2-10 uppercase letters'),
  
  body('allowedIpRanges')
    .isArray({ min: 1 })
    .withMessage('At least one IP range must be provided'),
  
  handleValidationErrors
];

// MongoDB ObjectId validation
const validateObjectId = (paramName = 'id') => [
  param(paramName)
    .custom(value => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error(`Invalid ${paramName}`);
      }
      return true;
    }),
  
  handleValidationErrors
];

// Pagination validation
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateUserRegistration,
  validateLogin,
  validateSessionCreation,
  validateCourseCreation,
  validateInstitutionCreation,
  validateObjectId,
  validatePagination
};
