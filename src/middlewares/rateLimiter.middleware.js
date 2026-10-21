import rateLimit from 'express-rate-limit';
import { getRedisClient } from '../config/redis.config.js';
import logger, { logSecurity } from '../config/winston.config.js';

/**
 * Create a custom key generator that uses user ID if authenticated
 */
const keyGenerator = (req) => {
  // Use user ID if authenticated, otherwise use IP
  const userId = req.user?._id || req.admin?._id;
  return userId ? `user:${userId}` : `ip:${req.ip}`;
};

/**
 * Custom handler for rate limit exceeded
 */
const handler = (req, res) => {
  const identifier = keyGenerator(req);
  
  logSecurity('Rate limit exceeded', {
    identifier,
    ip: req.ip,
    path: req.path,
    method: req.method
  });
  
  res.status(429).json({
    success: false,
    message: 'Too many requests, please try again later',
    retryAfter: res.getHeader('Retry-After')
  });
};

/**
 * Skip rate limiting for certain conditions
 */
const skip = (req) => {
  // Skip rate limiting in test environment
  if (process.env.NODE_ENV === 'test') {
    return true;
  }
  
  // Skip for whitelisted IPs (if configured)
  const whitelist = process.env.RATE_LIMIT_WHITELIST?.split(',') || [];
  if (whitelist.includes(req.ip)) {
    return true;
  }
  
  return false;
};

/**
 * General API Rate Limiter
 * 500 requests per 15 minutes (increased for realistic use)
 */
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 500,
  message: 'Too many requests, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler,
  skip
});

/**
 * Auth Routes Rate Limiter
 * 30 requests per minute (allows dev / OTP retries)
 */
export const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: 'Too many authentication attempts, please wait a minute',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler: (req, res) => {
    const identifier = keyGenerator(req);
    logSecurity('Auth rate limit exceeded', { identifier, ip: req.ip, path: req.path, method: req.method, severity: 'high' });
    res.status(429).json({ success: false, message: 'Too many authentication attempts. Please wait 1 minute and try again.', retryAfter: 60 });
  },
  skip
});

/**
 * Message Routes Rate Limiter
 * 200 requests per minute per user
 */
export const messageLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: 'Too many messages sent, please slow down',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Always use user ID for messages (must be authenticated)
    const userId = req.user?._id || req.admin?._id;
    return userId ? `user:${userId}` : `ip:${req.ip}`;
  },
  handler,
  skip
});

/**
 * Admin Routes Rate Limiter
 * 500 requests per 15 minutes
 */
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: 'Too many admin requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler,
  skip
});

/**
 * File Upload Rate Limiter
 * 20 requests per hour (prevent abuse of upload endpoints)
 */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: 'Too many file uploads, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler,
  skip
});

/**
 * Email/OTP Rate Limiter
 * 5 requests per hour (prevent spam)
 */
export const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: 'Too many email/OTP requests, please try again after an hour',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler: (req, res) => {
    const identifier = keyGenerator(req);
    
    logSecurity('Email rate limit exceeded', {
      identifier,
      ip: req.ip,
      path: req.path,
      severity: 'medium'
    });
    
    res.status(429).json({
      success: false,
      message: 'Too many email/OTP requests. Please wait 1 hour and try again.',
      retryAfter: 3600
    });
  },
  skip
});

/**
 * Post Creation Rate Limiter
 * 30 posts per hour per user
 */
export const postCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30,
  message: 'Too many posts created, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userId = req.user?._id || req.admin?._id;
    return userId ? `user:${userId}:posts` : `ip:${req.ip}:posts`;
  },
  handler,
  skip
});

/**
 * Comment Creation Rate Limiter
 * 60 comments per hour per user
 */
export const commentCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 60,
  message: 'Too many comments created, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userId = req.user?._id || req.admin?._id;
    return userId ? `user:${userId}:comments` : `ip:${req.ip}:comments`;
  },
  handler,
  skip
});

/**
 * Connection Request Rate Limiter
 * 50 connection requests per day per user
 */
export const connectionRequestLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 50,
  message: 'Too many connection requests sent, please try again tomorrow',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const userId = req.user?._id;
    return userId ? `user:${userId}:connections` : `ip:${req.ip}:connections`;
  },
  handler,
  skip
});

/**
 * Search Rate Limiter
 * 100 searches per hour per user
 */
export const searchLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100,
  message: 'Too many search requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler,
  skip
});

/**
 * Failed Login Attempt Tracker
 * Custom middleware to track and block repeated failed logins
 */
const failedLoginAttempts = new Map();

export const trackFailedLogin = (identifier) => {
  const attempts = failedLoginAttempts.get(identifier) || { count: 0, firstAttempt: Date.now() };
  attempts.count++;
  attempts.lastAttempt = Date.now();
  
  // Reset counter after 1 hour
  if (Date.now() - attempts.firstAttempt > 60 * 60 * 1000) {
    attempts.count = 1;
    attempts.firstAttempt = Date.now();
  }
  
  failedLoginAttempts.set(identifier, attempts);
  
  // Log suspicious activity
  if (attempts.count > 5) {
    logSecurity('Multiple failed login attempts', {
      identifier,
      attempts: attempts.count,
      severity: 'high'
    });
  }
  
  return attempts.count;
};

export const resetFailedLogin = (identifier) => {
  failedLoginAttempts.delete(identifier);
};

export const checkFailedLoginAttempts = (req, res, next) => {
  const identifier = keyGenerator(req);
  const attempts = failedLoginAttempts.get(identifier);
  
  if (attempts && attempts.count >= 10) {
    const timeSinceFirst = Date.now() - attempts.firstAttempt;
    const remainingTime = Math.ceil((60 * 60 * 1000 - timeSinceFirst) / 1000 / 60);
    
    logSecurity('Account locked due to failed login attempts', {
      identifier,
      attempts: attempts.count,
      severity: 'critical'
    });
    
    return res.status(429).json({
      success: false,
      message: `Account temporarily locked due to too many failed login attempts. Please try again in ${remainingTime} minutes.`,
      retryAfter: remainingTime * 60
    });
  }
  
  next();
};

// Clean up old entries periodically (every hour)
setInterval(() => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  for (const [identifier, attempts] of failedLoginAttempts.entries()) {
    if (attempts.lastAttempt < oneHourAgo) {
      failedLoginAttempts.delete(identifier);
    }
  }
}, 60 * 60 * 1000);

export default {
  generalLimiter,
  authLimiter,
  messageLimiter,
  adminLimiter,
  uploadLimiter,
  emailLimiter,
  postCreationLimiter,
  commentCreationLimiter,
  connectionRequestLimiter,
  searchLimiter,
  trackFailedLogin,
  resetFailedLogin,
  checkFailedLoginAttempts
};
