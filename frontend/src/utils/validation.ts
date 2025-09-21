export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  if (password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const validateStudentId = (studentId: string): boolean => {
  // Basic validation - can be customized based on institution's format
  return /^[A-Z0-9]{6,12}$/i.test(studentId);
};

export const validateRequired = (value: string): boolean => {
  return value.trim().length > 0;
};

export const validateForm = (
  fields: Record<string, any>,
  rules: Record<string, (value: any) => string | null>
): Record<string, string> => {
  const errors: Record<string, string> = {};

  Object.keys(rules).forEach((fieldName) => {
    const validator = rules[fieldName];
    const error = validator(fields[fieldName]);
    if (error) {
      errors[fieldName] = error;
    }
  });

  return errors;
};
