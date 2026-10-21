import { validationResult } from 'express-validator';
import ApiError from '../utils/ApiError.js';
import logger from '../config/winston.config.js';

// Validation result handler
export const validate = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const extractedErrors = [];
    const errorsArray = errors.array();
    
    errorsArray.forEach(err => {
      extractedErrors.push({
        field: err.path || err.param,
        message: err.msg,
        value: err.value
      });
    });
    
    logger.warn('Validation failed', {
      path: req.path,
      method: req.method,
      errors: extractedErrors,
      ip: req.ip,
      userId: req.user?._id || req.admin?._id
    });
    
    throw new ApiError(400, 'Validation failed', extractedErrors);
  }
  
  next();
};

// Custom validator: Check if value is a valid MongoDB ObjectId
export const isValidObjectId = (value) => {
  return /^[0-9a-fA-F]{24}$/.test(value);
};

// Custom validator: Check if email is valid
export const isValidEmail = (value) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
};

// Custom validator: Check password strength
export const isStrongPassword = (value) => {
  const hasMinLength = value.length >= 6;
  const hasLetter = /[a-zA-Z]/.test(value);
  const hasNumber = /\d/.test(value);
  
  return hasMinLength && hasLetter && hasNumber;
};

// Custom validator: Check if string is not just whitespace
export const isNotEmptyString = (value) => {
  return typeof value === 'string' && value.trim().length > 0;
};

// Custom validator: Check if value is within allowed options
export const isOneOf = (allowedValues) => {
  return (value) => allowedValues.includes(value);
};

// Custom validator: Check if array has unique values
export const hasUniqueValues = (array) => {
  return new Set(array).size === array.length;
};

// Sanitizer: Normalize email (lowercase, trim)
export const normalizeEmail = (email) => {
  return email.toLowerCase().trim();
};

// Sanitizer: Clean string (trim, remove extra spaces)
export const cleanString = (str) => {
  return str.trim().replace(/\s+/g, ' ');
};

// Sanitizer: Remove HTML tags
export const stripHtml = (str) => {
  return str.replace(/<[^>]*>/g, '');
};

// Custom validator: Check if date is in the future
export const isFutureDate = (value) => {
  const date = new Date(value);
  return date > new Date();
};

// Custom validator: Check if date is in the past
export const isPastDate = (value) => {
  const date = new Date(value);
  return date < new Date();
};

// Custom validator: Check if URL is valid
export const isValidUrl = (value) => {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

// Custom validator: Check file upload
export const isValidFileUpload = (file, allowedTypes = [], maxSize = 10 * 1024 * 1024) => {
  if (!file) return false;
  
  if (file.size > maxSize) {
    throw new Error(`File size exceeds ${maxSize / 1024 / 1024}MB`);
  }
  
  if (allowedTypes.length > 0) {
    const fileType = file.mimetype;
    if (!allowedTypes.includes(fileType)) {
      throw new Error(`File type ${fileType} not allowed`);
    }
  }
  
  return true;
};

// Middleware to validate pagination parameters
export const validatePagination = (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  
  if (page < 1) {
    throw new ApiError(400, 'Page number must be at least 1');
  }
  
  if (limit < 1 || limit > 100) {
    throw new ApiError(400, 'Limit must be between 1 and 100');
  }
  
  req.pagination = {
    page,
    limit,
    skip: (page - 1) * limit
  };
  
  next();
};

// Middleware to validate sort parameters
export const validateSort = (allowedFields = []) => {
  return (req, res, next) => {
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder || 'desc';
    
    if (allowedFields.length > 0 && !allowedFields.includes(sortBy)) {
      throw new ApiError(400, `Invalid sort field. Allowed: ${allowedFields.join(', ')}`);
    }
    
    if (!['asc', 'desc'].includes(sortOrder)) {
      throw new ApiError(400, 'Sort order must be "asc" or "desc"');
    }
    req.sort = {
      [sortBy]: sortOrder === 'asc' ? 1 : -1
    };
    
    next();
  };
};

// Middleware to validate search query
export const validateSearch = (req, res, next) => {
  const query = req.query.q || req.query.search || '';
  
  if (query && query.length < 2) {
    throw new ApiError(400, 'Search query must be at least 2 characters');
  }
  
  if (query.length > 100) {
    throw new ApiError(400, 'Search query must not exceed 100 characters');
  }
  req.searchQuery = cleanString(query);
  
  next();
};

// Create a validation chain that can be reused
export const createValidationChain = (validations) => {
  return [...validations, validate];
};

export default {
  validate,
  isValidObjectId,
  isValidEmail,
  isStrongPassword,
  isNotEmptyString,
  isOneOf,
  hasUniqueValues,
  normalizeEmail,
  cleanString,
  stripHtml,
  isFutureDate,
  isPastDate,
  isValidUrl,
  isValidFileUpload,
  validatePagination,
  validateSort,
  validateSearch,
  createValidationChain
};
