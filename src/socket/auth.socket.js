import jwt from 'jsonwebtoken';
import User from '../models/user.model.js';
import Admin from '../models/admin.model.js';
import logger, { logSecurity } from '../config/winston.config.js';

/**
 * Socket.io authentication middleware
 * Verifies JWT token from handshake and attaches user to socket
 * 
 * @param {Object} socket - Socket instance
 * @param {Function} next - Next middleware function
 */
export const authenticateSocket = async (socket, next) => {
  try {
    // Get token from handshake auth or query
    const token = 
      socket.handshake.auth?.token || 
      socket.handshake.headers?.authorization?.replace('Bearer ', '') ||
      socket.handshake.query?.token;
    
    if (!token) {
      const error = new Error('Authentication error: No token provided');
      error.data = { code: 'NO_TOKEN' };
      return next(error);
    }
    
    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (jwtError) {
      const error = new Error('Authentication error: Invalid or expired token');
      error.data = { 
        code: jwtError.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN'
      };
      
      logSecurity('Socket authentication failed', {
        reason: jwtError.message,
        socketId: socket.id,
        ip: socket.handshake.address
      });
      
      return next(error);
    }
    
    // Find user
    let user = await User.findById(decoded._id).select('-password -refreshToken');
    
    // If not found in User collection, try Admin collection
    if (!user) {
      user = await Admin.findById(decoded._id).select('-password -refreshToken');
    }
    
    if (!user) {
      const error = new Error('Authentication error: User not found');
      error.data = { code: 'USER_NOT_FOUND' };
      
      logSecurity('Socket authentication failed: User not found', {
        userId: decoded._id,
        socketId: socket.id,
        ip: socket.handshake.address
      });
      
      return next(error);
    }
    
    // Check if user is banned
    if (user.banStatus && user.banStatus !== 'active') {
      // Check if temp ban has expired
      if (user.banStatus === 'temp_banned' && user.banExpiresAt) {
        if (new Date() > new Date(user.banExpiresAt)) {
          // Ban expired, allow connection
          user.banStatus = 'active';
          user.banReason = null;
          user.banExpiresAt = null;
          await user.save();
        } else {
          // Still banned
          const error = new Error('Authentication error: Account is banned');
          error.data = { 
            code: 'USER_BANNED',
            banStatus: user.banStatus,
            banReason: user.banReason,
            banExpiresAt: user.banExpiresAt
          };
          
          logSecurity('Banned user attempted socket connection', {
            userId: user._id,
            banStatus: user.banStatus,
            socketId: socket.id
          });
          
          return next(error);
        }
      } else if (user.banStatus === 'suspended') {
        // Permanently suspended
        const error = new Error('Authentication error: Account is suspended');
        error.data = { 
          code: 'USER_SUSPENDED',
          banReason: user.banReason
        };
        
        logSecurity('Suspended user attempted socket connection', {
          userId: user._id,
          socketId: socket.id
        });
        
        return next(error);
      }
    }
    
    // Attach user to socket
    socket.user = user;
    
    logger.info('Socket authenticated successfully', {
      userId: user._id,
      email: user.email,
      role: user.role,
      socketId: socket.id,
      ip: socket.handshake.address
    });
    
    next();
    
  } catch (error) {
    logger.error('Socket authentication error:', {
      error: error.message,
      socketId: socket.id,
      ip: socket.handshake.address
    });
    
    const authError = new Error('Authentication error: Internal server error');
    authError.data = { code: 'INTERNAL_ERROR' };
    next(authError);
  }
};

/**
 * Check if socket user has specific permission
 * @param {Object} socket - Socket instance
 * @param {string} permission - Permission to check
 * @returns {boolean}
 */
export const socketHasPermission = (socket, permission) => {
  if (!socket.user) return false;
  
  // Import permission checker dynamically to avoid circular dependency
  const { hasPermission } = require('../config/permissions.config.js');
  return hasPermission(socket.user.role, permission);
};

/**
 * Require authentication for socket event
 * Wrapper function to check authentication before handling event
 * 
 * @param {Function} handler - Event handler function
 * @returns {Function} Wrapped handler
 */
export const requireSocketAuth = (handler) => {
  return async (data, callback) => {
    // 'this' refers to the socket
    if (!this.user) {
      const error = {
        success: false,
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      };
      
      if (typeof callback === 'function') {
        callback(error);
      } else {
        this.emit('error', error);
      }
      
      return;
    }
    
    // Call the actual handler
    return handler.call(this, data, callback);
  };
};

export default {
  authenticateSocket,
  socketHasPermission,
  requireSocketAuth
};
