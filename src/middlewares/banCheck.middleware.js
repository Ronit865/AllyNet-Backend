import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { ROLES } from '../config/permissions.config.js';
import { logSecurity } from '../config/winston.config.js';

/**
 * Check if user is banned and prevent banned users from accessing routes
 * Automatically handles temp ban expiration
 * 
 * @param {Object} options - Configuration options
 * @param {boolean} options.allowTempBanned - Allow temp banned users
 * @param {boolean} options.checkExpiry - Check and update expired temp bans
 * @returns {Function} Express middleware
 */
export const checkBanStatus = (options = {}) => {
  const { 
    allowTempBanned = false,
    checkExpiry = true 
  } = options;
  
  return asyncHandler(async (req, res, next) => {
    const user = req.user || req.admin;
    
    if (!user) {
      throw new ApiError(401, 'Authentication required');
    }
    
    // Admins and superadmins are never subject to ban checks
    if ([ROLES.ADMIN, ROLES.SUPERADMIN, ROLES.MODERATOR].includes(user.role)) {
      return next();
    }
    
    // If user has no ban status field, assume active
    if (!user.banStatus) {
      user.banStatus = 'active';
    }
    
    // Check for suspended users (permanent ban)
    if (user.banStatus === 'suspended') {
      logSecurity('Suspended user attempted access', {
        userId: user._id,
        email: user.email,
        path: req.path,
        method: req.method,
        ip: req.ip,
        severity: 'medium'
      });
      
      const message = user.banReason 
        ? `Your account has been suspended. Reason: ${user.banReason}. Please contact support.`
        : 'Your account has been suspended. Please contact support.';
      
      throw new ApiError(403, message);
    }
    
    // Check for temp banned users
    if (user.banStatus === 'temp_banned') {
      // Check if temp ban has expired
      if (checkExpiry && user.banExpiresAt) {
        const now = new Date();
        const expiryDate = new Date(user.banExpiresAt);
        
        if (now > expiryDate) {
          // Ban has expired, restore user to active status
          user.banStatus = 'active';
          user.banReason = null;
          user.banExpiresAt = null;
          await user.save();
          
          logSecurity('Temp ban automatically expired', {
            userId: user._id,
            email: user.email,
            previousBanReason: user.banReason
          });
          
          return next();
        }
      }
      
      // Ban is still active
      if (!allowTempBanned) {
        logSecurity('Temp banned user attempted access', {
          userId: user._id,
          email: user.email,
          path: req.path,
          method: req.method,
          ip: req.ip,
          banExpiresAt: user.banExpiresAt,
          severity: 'low'
        });
        
        const expiryMessage = user.banExpiresAt 
          ? ` Your ban expires on ${new Date(user.banExpiresAt).toLocaleString()}.`
          : '';
        
        const reasonMessage = user.banReason 
          ? ` Reason: ${user.banReason}.`
          : '';
        
        throw new ApiError(403, `Your account is temporarily banned.${reasonMessage}${expiryMessage}`);
      }
    }
    
    next();
  });
};

/**
 * Standard ban check middleware
 * Blocks suspended and temp banned users
 */
export const requireNotBanned = checkBanStatus({
  allowTempBanned: false,
  checkExpiry: true
});

/**
 * Lenient ban check
 * Only blocks suspended users, allows temp banned
 */
export const requireNotSuspended = checkBanStatus({
  allowTempBanned: true,
  checkExpiry: true
});

/**
 * Check if user can perform content creation
 * Used for posts, comments, messages
 */
export const canCreateContent = asyncHandler(async (req, res, next) => {
  const user = req.user || req.admin;
  
  if (!user) {
    throw new ApiError(401, 'Authentication required');
  }
  
  // Admins can always create content
  if ([ROLES.ADMIN, ROLES.SUPERADMIN, ROLES.MODERATOR].includes(user.role)) {
    return next();
  }
  
  // Check ban status
  if (user.banStatus !== 'active') {
    logSecurity('Banned user attempted content creation', {
      userId: user._id,
      banStatus: user.banStatus,
      path: req.path,
      contentType: req.path.split('/')[2] // post, comment, message, etc.
    });
    
    throw new ApiError(403, 'You cannot create content while your account is restricted');
  }
  
  // Check report count (soft limit)
  if (user.reportCount && user.reportCount >= 5) {
    logSecurity('High report count user creating content', {
      userId: user._id,
      reportCount: user.reportCount,
      path: req.path,
      severity: 'low'
    });
    
    // Don't block, just log (admins can review)
  }
  
  next();
});

/**
 * Update ban expiry check
 * Utility function to check and update expired bans
 * Can be called periodically or on user login
 */
export const updateExpiredBans = async (userId) => {
  try {
    // Dynamically import to avoid circular dependencies
    const { default: User } = await import('../models/user.model.js');
    
    const user = await User.findById(userId);
    
    if (!user || user.banStatus !== 'temp_banned' || !user.banExpiresAt) {
      return false;
    }
    
    const now = new Date();
    const expiryDate = new Date(user.banExpiresAt);
    
    if (now > expiryDate) {
      user.banStatus = 'active';
      user.banReason = null;
      user.banExpiresAt = null;
      await user.save();
      
      logSecurity('Temp ban manually expired', {
        userId: user._id,
        email: user.email
      });
      
      return true;
    }
    
    return false;
  } catch (error) {
    logger.error('Error updating expired ban:', { error: error.message, userId });
    return false;
  }
};

/**
 * Get ban information for a user
 * Utility function for displaying ban details
 */
export const getBanInfo = (user) => {
  if (!user || user.banStatus === 'active') {
    return {
      isBanned: false,
      banStatus: 'active'
    };
  }
  
  const banInfo = {
    isBanned: true,
    banStatus: user.banStatus,
    banReason: user.banReason || null,
    banExpiresAt: user.banExpiresAt || null
  };
  
  // Check if temp ban has expired
  if (user.banStatus === 'temp_banned' && user.banExpiresAt) {
    const now = new Date();
    const expiryDate = new Date(user.banExpiresAt);
    banInfo.hasExpired = now > expiryDate;
    banInfo.timeRemaining = expiryDate - now;
  }
  
  return banInfo;
};

export default {
  checkBanStatus,
  requireNotBanned,
  requireNotSuspended,
  canCreateContent,
  updateExpiredBans,
  getBanInfo
};
