import helmet from 'helmet';
import logger from '../config/winston.config.js';

// Security headers using Helmet.js
export const securityHeaders = helmet({
  // Content Security Policy
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:', 'http:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  
  // X-DNS-Prefetch-Control
  dnsPrefetchControl: {
    allow: false
  },
  
  // X-Frame-Options
  frameguard: {
    action: 'deny'
  },
  
  // Hide X-Powered-By header
  hidePoweredBy: true,
  
  // HTTP Strict Transport Security
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  
  // X-Download-Options
  ieNoOpen: true,
  
  // X-Content-Type-Options
  noSniff: true,
  
  // X-Permitted-Cross-Domain-Policies
  permittedCrossDomainPolicies: {
    permittedPolicies: 'none'
  },
  
  // Referrer-Policy
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  },
  
  xssFilter: true
});

// NoSQL injection prevention (manually sanitize to avoid req.query modification issues)
export const preventNoSQLInjection = (req, res, next) => {
  const sanitize = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    
    Object.keys(obj).forEach(key => {
      if (key.includes('$') || key.includes('.')) {
        logger.warn('Potential NoSQL injection attempt detected', {
          ip: req.ip,
          path: req.path,
          key,
          userId: req.user?._id || req.admin?._id
        });
        delete obj[key];
      } else if (typeof obj[key] === 'object') {
        sanitize(obj[key]);
      }
    });
  };
  
  if (req.body) sanitize(req.body);
  if (req.params) sanitize(req.params);
  
  next();
};

// XSS protection - sanitizes string inputs
export const xssProtection = (req, res, next) => {
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        req.body[key] = req.body[key].trim();
      }
    });
  }
  
  next();
};

// Request size limiter based on route type
export const requestSizeLimiter = (req, res, next) => {
  const contentLength = parseInt(req.get('content-length')) || 0;
  
  let maxSize = 1 * 1024 * 1024; // 1MB default
  
  if (req.path.includes('/upload') || req.path.includes('/avatar') || req.path.includes('/csv')) {
    maxSize = 10 * 1024 * 1024; // 10MB for uploads
  }
  
  if (req.path.includes('/login') || req.path.includes('/register')) {
    maxSize = 100 * 1024; // 100KB for auth
  }
  
  if (contentLength > maxSize) {
    logger.warn('Request body size exceeded limit', {
      ip: req.ip,
      path: req.path,
      size: contentLength,
      limit: maxSize
    });
    
    return res.status(413).json({
      success: false,
      message: 'Request body too large',
      maxSize: `${maxSize / 1024 / 1024}MB`
    });
  }
  
  next();
};

// HTTP Parameter Pollution Prevention
export const preventParameterPollution = (req, res, next) => {
  const duplicateKeys = [];
  
  Object.keys(req.query).forEach(key => {
    if (Array.isArray(req.query[key])) {
      duplicateKeys.push(key);
    }
  });
  
  if (duplicateKeys.length > 0) {
    logger.warn('HTTP Parameter Pollution attempt detected', {
      ip: req.ip,
      path: req.path,
      duplicateParams: duplicateKeys
    });
    
    return res.status(400).json({
      success: false,
      message: 'Invalid request: duplicate parameters detected'
    });
  }
  
  next();
};

// Security middleware stack
export const securityMiddleware = [
  securityHeaders,
  preventNoSQLInjection,
  xssProtection,
  preventParameterPollution,
  requestSizeLimiter
];

export default securityMiddleware;
