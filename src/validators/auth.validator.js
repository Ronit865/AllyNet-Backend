import { body, param } from 'express-validator';
import { isStrongPassword, normalizeEmail } from '../middlewares/validation.middleware.js';

/**
 * Validation rules for user registration
 */
export const registerValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 3, max: 50 })
    .withMessage('Name must be between 3 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail()
    .customSanitizer(normalizeEmail),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .custom(isStrongPassword)
    .withMessage('Password must contain at least one letter and one number'),
  
  body('role')
    .optional()
    .isIn(['student', 'alumni'])
    .withMessage('Role must be either student or alumni'),
  
  body('graduationYear')
    .optional()
    .isInt({ min: 1950, max: 2050 })
    .withMessage('Invalid graduation year'),
  
  body('course')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Course name must not exceed 100 characters')
];

/**
 * Validation rules for user login
 */
export const loginValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail()
    .customSanitizer(normalizeEmail),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

/**
 * Validation rules for password change
 */
export const changePasswordValidation = [
  body('oldPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters')
    .custom(isStrongPassword)
    .withMessage('New password must contain at least one letter and one number')
    .custom((value, { req }) => {
      if (value === req.body.oldPassword) {
        throw new Error('New password must be different from current password');
      }
      return true;
    }),
  
  body('confirmPassword')
    .notEmpty()
    .withMessage('Please confirm your new password')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Passwords do not match');
      }
      return true;
    })
];

/**
 * Validation rules for forgot password (request OTP)
 */
export const forgotPasswordValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail()
    .customSanitizer(normalizeEmail)
];

/**
 * Validation rules for reset password (with OTP)
 */
export const resetPasswordValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail()
    .customSanitizer(normalizeEmail),
  
  body('otp')
    .notEmpty()
    .withMessage('OTP is required')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be 6 digits')
    .isNumeric()
    .withMessage('OTP must contain only numbers'),
  
  body('newPassword')
    .notEmpty()
    .withMessage('New password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
    .custom(isStrongPassword)
    .withMessage('Password must contain at least one letter and one number')
];

/**
 * Validation rules for email verification
 */
export const verifyEmailValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  
  body('otp')
    .notEmpty()
    .withMessage('OTP is required')
    .isLength({ min: 6, max: 6 })
    .withMessage('OTP must be 6 digits')
    .isNumeric()
    .withMessage('OTP must contain only numbers')
];

/**
 * Validation rules for refresh token
 */
export const refreshTokenValidation = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required')
];

export default {
  registerValidation,
  loginValidation,
  changePasswordValidation,
  forgotPasswordValidation,
  resetPasswordValidation,
  verifyEmailValidation,
  refreshTokenValidation
};
