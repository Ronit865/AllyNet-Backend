import ApiError from '../utils/ApiError.js';
import logger, { logError } from '../config/winston.config.js';
import mongoose from 'mongoose';

/**
 * Handle Mongoose CastError (invalid ObjectId)
 */
const handleCastError = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new ApiError(400, message);
};

/**
 * Handle Mongoose Validation Error
 */
const handleValidationError = (err) => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new ApiError(400, message);
};

/**
 * Handle Mongoose Duplicate Key Error
 */
const handleDuplicateKeyError = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  const message = `Duplicate value for ${field}: '${value}'. Please use another value.`;
  return new ApiError(409, message);
};

/**
 * Handle JWT Error
 */
const handleJWTError = () => {
  return new ApiError(401, 'Invalid token. Please login again.');
};

/**
 * Handle JWT Expired Error
 */
const handleJWTExpiredError = () => {
  return new ApiError(401, 'Your token has expired. Please login again.');
};

/**
 * Handle Multer Error (file upload)
 */
const handleMulterError = (err) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return new ApiError(400, 'File size too large. Maximum size is 10MB.');
  }
  if (err.code === 'LIMIT_FILE_COUNT') {
    return new ApiError(400, 'Too many files. Maximum is 10 files.');
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return new ApiError(400, 'Unexpected field in file upload.');
  }
  return new ApiError(400, `File upload error: ${err.message}`);
};

/**
 * Send error response in development
 */
const sendErrorDev = (err, req, res) => {
  // Log full error in development
  logError(err, {
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: req.user?._id || req.admin?._id
  });
  
  res.status(err.statusCode).json({
    success: false,
    error: err,
    message: err.message,
    stack: err.stack,
    path: req.path,
    timestamp: new Date().toISOString()
  });
};

/**
 * Send error response in production
 */
const sendErrorProd = (err, req, res) => {
  // Operational errors: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      timestamp: new Date().toISOString()
    });
  } 
  // Programming or unknown errors: don't leak details
  else {
    // Log error for debugging
    logError(err, {
      path: req.path,
      method: req.method,
      ip: req.ip,
      userId: req.user?._id || req.admin?._id,
      severity: 'critical'
    });
    
    // Send generic message
    res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again later.',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Global Error Handler Middleware
 */
export const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;
  error.isOperational = err.isOperational || false;
  
  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    error = handleCastError(err);
  }
  
  // Mongoose ValidationError
  if (err.name === 'ValidationError') {
    error = handleValidationError(err);
  }
  
  // Mongoose Duplicate Key Error
  if (err.code === 11000) {
    error = handleDuplicateKeyError(err);
  }
  
  // JWT Errors
  if (err.name === 'JsonWebTokenError') {
    error = handleJWTError();
  }
  
  if (err.name === 'TokenExpiredError') {
    error = handleJWTExpiredError();
  }
  
  // Multer Errors
  if (err.name === 'MulterError') {
    error = handleMulterError(err);
  }
  
  // Send error response
  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(error, req, res);
  } else {
    sendErrorProd(error, req, res);
  }
};

/**
 * Handle unhandled routes (404)
 */
export const notFoundHandler = (req, res, next) => {
  const error = new ApiError(404, `Route not found: ${req.originalUrl}`);
  next(error);
};

/**
 * Async error wrapper (alternative to existing asyncHandler)
 * Catches errors in async route handlers
 */
export const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default {
  errorHandler,
  notFoundHandler,
  catchAsync
};
