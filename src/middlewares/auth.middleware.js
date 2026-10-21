import jwt from 'jsonwebtoken';
import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import User from '../models/user.model.js';
import logger, { logSecurity } from '../config/winston.config.js';
import { isAdmin } from '../constants/roles.js';

export const authenticate = asyncHandler(async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '') || req.cookies?.accessToken;

    if (!token) {
      throw new ApiError(401, 'Authentication required');
    }

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decoded._id).select('-password -refreshToken');

    if (!user) {
      logSecurity('Valid token but user not found', {
        tokenId: decoded._id,
        ip: req.ip,
        path: req.path
      });
      throw new ApiError(404, 'User not found');
    }

    req.user = user;
    req.isAuthenticated = true;

    if (isAdmin(user.role)) {
      req.admin = user;
    }

    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      throw new ApiError(401, 'Invalid token');
    } else if (err.name === 'TokenExpiredError') {
      throw new ApiError(401, 'Token expired');
    } else if (err instanceof ApiError) {
      throw err;
    } else {
      logger.error('Authentication error:', { error: err.message, path: req.path });
      throw new ApiError(401, 'Authentication failed');
    }
  }
});

export const optionalAuth = asyncHandler(async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '') || req.cookies?.accessToken;

    if (!token) {
      req.isAuthenticated = false;
      return next();
    }

    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decoded._id).select('-password -refreshToken');

    if (user) {
      req.user = user;
      req.isAuthenticated = true;
      if (isAdmin(user.role)) {
        req.admin = user;
      }
    } else {
      req.isAuthenticated = false;
    }

    next();
  } catch (err) {
    req.isAuthenticated = false;
    next();
  }
});
