import { body, param, query } from 'express-validator';
import { isValidObjectId, isValidUrl } from '../middlewares/validation.middleware.js';

/**
 * Validation rules for updating user profile
 */
export const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Name must be between 3 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio must not exceed 500 characters'),
  
  body('currentPosition')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Current position must not exceed 100 characters'),
  
  body('company')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Company name must not exceed 100 characters'),
  
  body('location')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Location must not exceed 100 characters'),
  
  body('phone')
    .optional()
    .trim()
    .matches(/^[0-9+\-\s()]+$/)
    .withMessage('Invalid phone number format')
    .isLength({ min: 10, max: 20 })
    .withMessage('Phone number must be between 10 and 20 characters'),
  
  body('graduationYear')
    .optional()
    .isInt({ min: 1950, max: 2050 })
    .withMessage('Invalid graduation year'),
  
  body('course')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Course name must not exceed 100 characters'),
  
  body('linkedin')
    .optional()
    .trim()
    .custom((value) => {
      if (value && !isValidUrl(value)) {
        throw new Error('Invalid LinkedIn URL');
      }
      return true;
    }),
  
  body('github')
    .optional()
    .trim()
    .custom((value) => {
      if (value && !isValidUrl(value)) {
        throw new Error('Invalid GitHub URL');
      }
      return true;
    })
];

/**
 * Validation rules for getting user by ID
 */
export const getUserByIdValidation = [
  param('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .custom(isValidObjectId)
    .withMessage('Invalid user ID format')
];

/**
 * Validation rules for searching users
 */
export const searchUsersValidation = [
  query('q')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Search query must be between 2 and 100 characters'),
  
  query('role')
    .optional()
    .isIn(['student', 'alumni', 'admin', 'moderator'])
    .withMessage('Invalid role filter'),
  
  query('graduationYear')
    .optional()
    .isInt({ min: 1950, max: 2050 })
    .withMessage('Invalid graduation year'),
  
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

/**
 * Validation rules for updating avatar
 */
export const updateAvatarValidation = [
  // File validation is handled by multer middleware
  // This is just for additional checks if needed
];

/**
 * Validation rules for admin editing user details
 */
export const adminEditUserValidation = [
  param('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .custom(isValidObjectId)
    .withMessage('Invalid user ID format'),
  
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Name must be between 3 and 50 characters'),
  
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('role')
    .optional()
    .isIn(['student', 'alumni', 'admin', 'moderator', 'superadmin'])
    .withMessage('Invalid role'),
  
  body('isVerified')
    .optional()
    .isBoolean()
    .withMessage('isVerified must be a boolean'),
  
  body('banStatus')
    .optional()
    .isIn(['active', 'temp_banned', 'suspended'])
    .withMessage('Invalid ban status'),
  
  body('banReason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Ban reason must not exceed 500 characters'),
  
  body('banExpiresAt')
    .optional()
    .isISO8601()
    .withMessage('Invalid ban expiry date')
    .custom((value) => {
      const date = new Date(value);
      if (date <= new Date()) {
        throw new Error('Ban expiry date must be in the future');
      }
      return true;
    })
];

/**
 * Validation rules for banning a user
 */
export const banUserValidation = [
  param('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .custom(isValidObjectId)
    .withMessage('Invalid user ID format'),
  
  body('banType')
    .notEmpty()
    .withMessage('Ban type is required')
    .isIn(['temp_banned', 'suspended'])
    .withMessage('Ban type must be either temp_banned or suspended'),
  
  body('reason')
    .notEmpty()
    .withMessage('Ban reason is required')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Ban reason must be between 10 and 500 characters'),
  
  body('duration')
    .if(body('banType').equals('temp_banned'))
    .notEmpty()
    .withMessage('Duration is required for temporary bans')
    .isInt({ min: 1, max: 365 })
    .withMessage('Duration must be between 1 and 365 days')
];

/**
 * Validation rules for unbanning a user
 */
export const unbanUserValidation = [
  param('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .custom(isValidObjectId)
    .withMessage('Invalid user ID format')
];

/**
 * Validation rules for deleting a user
 */
export const deleteUserValidation = [
  param('userId')
    .notEmpty()
    .withMessage('User ID is required')
    .custom(isValidObjectId)
    .withMessage('Invalid user ID format')
];

/**
 * Validation rules for bulk user upload (CSV)
 */
export const bulkUploadValidation = [
  // File validation is handled by multer
  // CSV content validation happens in the controller
];

export default {
  updateProfileValidation,
  getUserByIdValidation,
  searchUsersValidation,
  updateAvatarValidation,
  adminEditUserValidation,
  banUserValidation,
  unbanUserValidation,
  deleteUserValidation,
  bulkUploadValidation
};
