import morgan from 'morgan';
import logger, { logHTTP } from '../config/winston.config.js';

// Morgan token for user ID
morgan.token('user-id', (req) => {
  return req.user?._id || req.admin?._id || 'anonymous';
});

// Morgan token for request ID
morgan.token('request-id', (req) => {
  return req.id || 'none';
});

const morganFormat = ':method :url :status :response-time ms - :user-id - :remote-addr';

const morganStream = {
  write: (message) => {
    logger.http(message.trim());
  }
};

// HTTP request logger using Morgan to Winston
export const httpLogger = morgan(morganFormat, { 
  stream: morganStream,
  skip: (req, res) => {
    return req.url === '/health' || req.url === '/ping';
  }
});

// Request timer middleware
export const requestTimer = (req, res, next) => {
  req._startAt = Date.now();
  
  res.on('finish', () => {
    const responseTime = (Date.now() - req._startAt).toFixed(2);
    logHTTP(req, res, responseTime);
  });
  
  next();
};

// Request ID middleware
export const requestId = (req, res, next) => {
  req.id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader('X-Request-ID', req.id);
  next();
};

// Response time header middleware
export const responseTimeHeader = (req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const time = (Date.now() - start).toFixed(2);
    res.setHeader('X-Response-Time', `${time}ms`);
  });
  
  next();
};

export default {
  httpLogger,
  requestTimer,
  requestId,
  responseTimeHeader
};
