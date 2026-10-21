import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

// Define colors for each level
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue'
};

winston.addColors(colors);

// Custom format for console output
const consoleFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;
  
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  
  return msg;
});

// Custom format for file output
const fileFormat = combine(
  timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  errors({ stack: true }),
  json()
);

// Determine log level based on environment
const level = () => {
  const env = process.env.NODE_ENV || 'development';
  const isDevelopment = env === 'development';
  return isDevelopment ? 'debug' : 'info';
};

// Create logs directory path
const logsDir = path.join(__dirname, '../../logs');

// Transport: Console
const consoleTransport = new winston.transports.Console({
  format: combine(
    colorize({ all: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    consoleFormat
  )
});

// Transport: All logs (rotated daily)
const allLogsTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'all-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d', // Keep logs for 14 days
  format: fileFormat
});

// Transport: Error logs (rotated daily)
const errorLogsTransport = new DailyRotateFile({
  level: 'error',
  filename: path.join(logsDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '30d', // Keep error logs for 30 days
  format: fileFormat
});

// Transport: HTTP logs (rotated daily)
const httpLogsTransport = new DailyRotateFile({
  level: 'http',
  filename: path.join(logsDir, 'http-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '7d', // Keep HTTP logs for 7 days
  format: fileFormat
});

// Transport: Audit logs (rotated daily)
const auditLogsTransport = new DailyRotateFile({
  filename: path.join(logsDir, 'audit-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '90d', // Keep audit logs for 90 days (compliance)
  format: fileFormat
});

// Create the logger
const logger = winston.createLogger({
  level: level(),
  levels,
  transports: [
    consoleTransport,
    allLogsTransport,
    errorLogsTransport,
    httpLogsTransport
  ],
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'exceptions.log') 
    })
  ],
  rejectionHandlers: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'rejections.log') 
    })
  ],
  exitOnError: false
});

// Create separate audit logger
export const auditLogger = winston.createLogger({
  level: 'info',
  format: fileFormat,
  transports: [auditLogsTransport],
  exitOnError: false
});

/**
 * Helper function to log HTTP requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {number} responseTime - Response time in milliseconds
 */
export const logHTTP = (req, res, responseTime) => {
  const { method, originalUrl, ip } = req;
  const { statusCode } = res;
  
  const message = `${method} ${originalUrl} ${statusCode} ${responseTime}ms - ${ip}`;
  
  logger.http(message, {
    method,
    url: originalUrl,
    statusCode,
    responseTime,
    ip,
    userAgent: req.get('user-agent') || 'unknown',
    userId: req.user?._id || req.admin?._id || 'anonymous'
  });
};

/**
 * Helper function to log audit events
 * @param {string} action - Action performed
 * @param {Object} actor - User who performed the action
 * @param {Object} target - Target of the action
 * @param {Object} details - Additional details
 */
export const logAudit = (action, actor, target = null, details = {}) => {
  auditLogger.info('Audit Event', {
    action,
    actor: {
      id: actor._id,
      email: actor.email,
      role: actor.role
    },
    target: target ? {
      type: target.type,
      id: target.id
    } : null,
    details,
    timestamp: new Date().toISOString()
  });
};

/**
 * Helper function to log security events
 * @param {string} event - Security event type
 * @param {Object} details - Event details
 */
export const logSecurity = (event, details = {}) => {
  logger.warn(`Security Event: ${event}`, {
    event,
    ...details,
    timestamp: new Date().toISOString()
  });
};

/**
 * Helper function to log errors with context
 * @param {Error} error - Error object
 * @param {Object} context - Additional context
 */
export const logError = (error, context = {}) => {
  logger.error(error.message, {
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    },
    ...context,
    timestamp: new Date().toISOString()
  });
};

export default logger;
