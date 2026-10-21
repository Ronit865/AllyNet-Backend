import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import { hasPermission, hasAnyPermission, isHigherRole, ROLES } from '../config/permissions.config.js';
import logger, { logSecurity } from '../config/winston.config.js';

export const requireRole = (allowedRoles) => {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
  
  return asyncHandler(async (req, res, next) => {
    const user = req.user || req.admin;
    
    if (!user) {
      throw new ApiError(401, 'Authentication required');
    }
    
    if (!roles.includes(user.role)) {
      logSecurity('Role access denied', {
        userId: user._id,
        userRole: user.role,
        requiredRoles: roles,
        path: req.path,
        ip: req.ip
      });
      
      throw new ApiError(403, `Access denied. Required role: ${roles.join(' or ')}`);
    }
    
    next();
  });
};

export const requirePermission = (requiredPermissions) => {
  const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
  
  return asyncHandler(async (req, res, next) => {
    const user = req.user || req.admin;
    
    if (!user) {
      throw new ApiError(401, 'Authentication required');
    }
    
    // Check if user has the required permission
    const hasRequiredPermission = permissions.some(permission => 
      hasPermission(user.role, permission)
    );
    
    if (!hasRequiredPermission) {
      logSecurity('Permission denied', {
        userId: user._id,
        userRole: user.role,
        requiredPermissions: permissions,
        path: req.path,
        ip: req.ip
      });
      
      throw new ApiError(403, 'You do not have permission to perform this action');
    }
    
    next();
  });
};

export const requireAnyPermission = (permissions) => {
  return asyncHandler(async (req, res, next) => {
    const user = req.user || req.admin;
    
    if (!user) {
      throw new ApiError(401, 'Authentication required');
    }
    
    const hasAny = hasAnyPermission(user.role, permissions);
    
    if (!hasAny) {
      logSecurity('Permission denied (any)', {
        userId: user._id,
        userRole: user.role,
        requiredPermissions: permissions,
        path: req.path,
        ip: req.ip
      });
      
      throw new ApiError(403, 'You do not have permission to perform this action');
    }
    
    next();
  });
};

export const requireOwnershipOrPermission = (resourceType, resourceIdParam, getResourceOwner, overridePermission) => {
  return asyncHandler(async (req, res, next) => {
    const user = req.user || req.admin;
    
    if (!user) {
      throw new ApiError(401, 'Authentication required');
    }
    
    // Check if user has override permission (e.g., admin can delete any post)
    if (hasPermission(user.role, overridePermission)) {
      return next();
    }
    
    // Get resource ID from params or body
    const resourceId = req.params[resourceIdParam] || req.body[resourceIdParam];
    
    if (!resourceId) {
      throw new ApiError(400, `${resourceType} ID is required`);
    }
    
    // Get the resource owner
    try {
      const ownerId = await getResourceOwner(resourceId);
      
      if (!ownerId) {
        throw new ApiError(404, `${resourceType} not found`);
      }
      
      // Check ownership
      if (ownerId.toString() !== user._id.toString()) {
        logSecurity('Ownership check failed', {
          userId: user._id,
          resourceType,
          resourceId,
          ownerId,
          path: req.path
        });
        
        throw new ApiError(403, `You can only modify your own ${resourceType}`);
      }
      
      next();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      
      logger.error('Error in ownership check:', { error: error.message, resourceType, resourceId });
      throw new ApiError(500, 'Error verifying resource ownership');
    }
  });
};

export const preventPrivilegeEscalation = (targetUserIdParam = 'userId') => {
  return asyncHandler(async (req, res, next) => {
    const actor = req.user || req.admin;
    
    if (!actor) {
      throw new ApiError(401, 'Authentication required');
    }
    
    // Superadmin can do anything
    if (actor.role === ROLES.SUPERADMIN) {
      return next();
    }
    
    const targetUserId = req.params[targetUserIdParam] || req.body[targetUserIdParam];
    
    if (!targetUserId) {
      throw new ApiError(400, 'Target user ID is required');
    }
    
    // Import User model dynamically to avoid circular dependencies
    const { default: User } = await import('../models/user.model.js');
    
    const targetUser = await User.findById(targetUserId).select('role');
    
    if (!targetUser) {
      throw new ApiError(404, 'Target user not found');
    }
    
    // Check if actor is trying to affect user with higher or equal role
    if (!isHigherRole(actor.role, targetUser.role)) {
      logSecurity('Privilege escalation attempt blocked', {
        actorId: actor._id,
        actorRole: actor.role,
        targetId: targetUser._id,
        targetRole: targetUser.role,
        path: req.path,
        ip: req.ip,
        severity: 'high'
      });
      
      throw new ApiError(403, 'You cannot perform this action on users with equal or higher privileges');
    }
    
    // Attach target user to request for use in controller
    req.targetUser = targetUser;
    
    next();
  });
};

export const requireNotBanned = (allowedStatuses = ['active']) => {
  return asyncHandler(async (req, res, next) => {
    const user = req.user || req.admin;
    
    if (!user) {
      throw new ApiError(401, 'Authentication required');
    }
    
    // Admins are never subject to ban checks
    if (req.admin || user.role === ROLES.ADMIN || user.role === ROLES.SUPERADMIN) {
      return next();
    }
    
    // Check ban status
    if (!allowedStatuses.includes(user.banStatus)) {
      // Check if temp ban has expired
      if (user.banStatus === 'temp_banned' && user.banExpiresAt) {
        if (new Date() > new Date(user.banExpiresAt)) {
          // Ban expired, update status
          user.banStatus = 'active';
          user.banReason = null;
          user.banExpiresAt = null;
          await user.save();
          return next();
        }
      }
      
      const banMessage = user.banReason 
        ? `Your account has been ${user.banStatus === 'temp_banned' ? 'temporarily banned' : 'suspended'}. Reason: ${user.banReason}`
        : `Your account has been ${user.banStatus === 'temp_banned' ? 'temporarily banned' : 'suspended'}.`;
      
      const expiryMessage = user.banExpiresAt 
        ? ` Ban expires: ${new Date(user.banExpiresAt).toLocaleString()}`
        : '';
      
      logSecurity('Banned user attempted action', {
        userId: user._id,
        banStatus: user.banStatus,
        banReason: user.banReason,
        path: req.path
      });
      
      throw new ApiError(403, banMessage + expiryMessage);
    }
    
    next();
  });
};

/**
 * Conditional permission middleware
 * Allows creating complex permission logic with conditions
 * 
 * @param {Object} config - Configuration object
 * @param {string} config.permission - Required permission
 * @param {Function} config.condition - Optional condition function
 * @returns {Function} Express middleware
 */
export const conditionalPermission = (config) => {
  const { permission, condition } = config;
  
  return asyncHandler(async (req, res, next) => {
    const user = req.user || req.admin;
    
    if (!user) {
      throw new ApiError(401, 'Authentication required');
    }
    
    // Check permission
    if (!hasPermission(user.role, permission)) {
      throw new ApiError(403, 'You do not have permission to perform this action');
    }
    
    // Check additional condition if provided
    if (condition && typeof condition === 'function') {
      const conditionMet = await condition(req, user);
      
      if (!conditionMet) {
        logSecurity('Conditional permission failed', {
          userId: user._id,
          permission,
          path: req.path
        });
        
        throw new ApiError(403, 'Conditions not met for this action');
      }
    }
    
    next();
  });
};

/**
 * Admin-only middleware (convenience wrapper)
 */
export const adminOnly = requireRole([ROLES.ADMIN, ROLES.SUPERADMIN, ROLES.MODERATOR]);

/**
 * Superadmin-only middleware
 */
export const superadminOnly = requireRole(ROLES.SUPERADMIN);

/**
 * Moderator or higher middleware
 */
export const moderatorOrHigher = requireRole([ROLES.MODERATOR, ROLES.ADMIN, ROLES.SUPERADMIN]);

export default {
  requireRole,
  requirePermission,
  requireAnyPermission,
  requireOwnershipOrPermission,
  preventPrivilegeEscalation,
  requireNotBanned,
  conditionalPermission,
  adminOnly,
  superadminOnly,
  moderatorOrHigher
};
