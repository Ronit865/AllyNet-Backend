import { body, param, query } from 'express-validator';
import { isValidObjectId } from '../middlewares/validation.middleware.js';

/**
 * Validation rules for admin login
 */
export const adminLoginValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

/**
 * Validation rules for changing admin password
 */
export const changeAdminPasswordValidation = [
  body('oldPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters')
    .custom((value, { req }) => {
      if (value === req.body.oldPassword) {
        throw new Error('New password must be different from current password');
      }
      return true;
    })
];

/**
 * Validation rules for CSV bulk upload
 */
export const csvUploadValidation = [
  // File validation handled by multer
  // Additional validation can be added here
];

/**
 * Validation rules for editing user details (admin)
 */
export const editUserDetailsValidation = [
  param('_id')
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
    .withMessage('Invalid ban status')
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
 * Validation rules for getting reports
 */
export const getReportsValidation = [
  query('status')
    .optional()
    .isIn(['pending', 'resolved', 'dismissed'])
    .withMessage('Invalid status'),
  
  query('type')
    .optional()
    .isIn(['post', 'comment', 'user', 'message'])
    .withMessage('Invalid report type'),
  
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
 * Validation rules for dismissing a report
 */
export const dismissReportValidation = [
  param('reportId')
    .notEmpty()
    .withMessage('Report ID is required')
    .custom(isValidObjectId)
    .withMessage('Invalid report ID format'),
  
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reason must not exceed 500 characters')
];

/**
 * Validation rules for updating admin profile
 */
export const updateAdminProfileValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Name must be between 3 and 50 characters'),
  
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail()
];

/**
 * Validation rules for getting user analytics
 */
export const getUserAnalyticsValidation = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format')
    .custom((value, { req }) => {
      if (req.query.startDate && value) {
        const start = new Date(req.query.startDate);
        const end = new Date(value);
        if (end < start) {
          throw new Error('End date must be after start date');
        }
      }
      return true;
    }),
  
  query('role')
    .optional()
    .isIn(['student', 'alumni', 'admin', 'moderator'])
    .withMessage('Invalid role')
];

/**
 * Validation rules for getting reported users
 */
export const getReportedUsersValidation = [
  query('minReports')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Minimum reports must be a positive integer'),
  
  query('banStatus')
    .optional()
    .isIn(['active', 'temp_banned', 'suspended'])
    .withMessage('Invalid ban status'),
  
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

export default {
  adminLoginValidation,
  changeAdminPasswordValidation,
  csvUploadValidation,
  editUserDetailsValidation,
  banUserValidation,
  unbanUserValidation,
  getReportsValidation,
  dismissReportValidation,
  updateAdminProfileValidation,
  getUserAnalyticsValidation,
  getReportedUsersValidation
};
