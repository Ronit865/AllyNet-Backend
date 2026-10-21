export const ROLES = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  ALUMNI: 'alumni',
  STUDENT: 'student'
};

export const PERMISSIONS = {
  USER_READ: 'user:read',
  USER_CREATE: 'user:create',
  USER_UPDATE: 'user:update',
  USER_UPDATE_OWN: 'user:update:own',
  USER_DELETE: 'user:delete',
  USER_BAN: 'user:ban',
  USER_UNBAN: 'user:unban',
  POST_CREATE: 'post:create',
  POST_READ: 'post:read',
  POST_UPDATE: 'post:update',
  POST_UPDATE_OWN: 'post:update:own',
  POST_DELETE: 'post:delete',
  POST_DELETE_OWN: 'post:delete:own',
  POST_PIN: 'post:pin',
  POST_MODERATE: 'post:moderate',
  COMMENT_CREATE: 'comment:create',
  COMMENT_READ: 'comment:read',
  COMMENT_UPDATE_OWN: 'comment:update:own',
  COMMENT_DELETE: 'comment:delete',
  COMMENT_DELETE_OWN: 'comment:delete:own',
  MESSAGE_SEND: 'message:send',
  MESSAGE_READ: 'message:read',
  MESSAGE_READ_ALL: 'message:read:all',
  EVENT_CREATE: 'event:create',
  EVENT_READ: 'event:read',
  EVENT_UPDATE: 'event:update',
  EVENT_UPDATE_OWN: 'event:update:own',
  EVENT_DELETE: 'event:delete',
  EVENT_DELETE_OWN: 'event:delete:own',
  JOB_CREATE: 'job:create',
  JOB_READ: 'job:read',
  JOB_UPDATE: 'job:update',
  JOB_UPDATE_OWN: 'job:update:own',
  JOB_DELETE: 'job:delete',
  JOB_DELETE_OWN: 'job:delete:own',
  REPORT_CREATE: 'report:create',
  REPORT_READ: 'report:read',
  REPORT_MANAGE: 'report:manage',
  REPORT_DISMISS: 'report:dismiss',
  ADMIN_READ: 'admin:read',
  ADMIN_CREATE: 'admin:create',
  ADMIN_UPDATE: 'admin:update',
  ADMIN_DELETE: 'admin:delete',
  AUDIT_READ: 'audit:read',
  SYSTEM_CONFIG: 'system:config',
  ANALYTICS_VIEW: 'analytics:view',
  CONNECTION_REQUEST: 'connection:request',
  CONNECTION_READ: 'connection:read',
  CONNECTION_MANAGE: 'connection:manage',
  DONATION_CREATE: 'donation:create',
  DONATION_READ: 'donation:read',
  DONATION_MANAGE: 'donation:manage',
  NOTIFICATION_READ: 'notification:read',
  NOTIFICATION_CREATE: 'notification:create',
  NOTIFICATION_SEND_ALL: 'notification:send:all'
};

/**
 * Role to Permission Mapping
 * '*' means all permissions
 */
export const ROLE_PERMISSIONS = {
  [ROLES.SUPERADMIN]: ['*'], // All permissions
  
  [ROLES.ADMIN]: [
    // User management
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_UPDATE,
    PERMISSIONS.USER_BAN,
    PERMISSIONS.USER_UNBAN,
    
    // Content management
    PERMISSIONS.POST_READ,
    PERMISSIONS.POST_CREATE,
    PERMISSIONS.POST_DELETE,
    PERMISSIONS.POST_PIN,
    PERMISSIONS.POST_MODERATE,
    PERMISSIONS.COMMENT_READ,
    PERMISSIONS.COMMENT_CREATE,
    PERMISSIONS.COMMENT_DELETE,
    
    // Reports and moderation
    PERMISSIONS.REPORT_READ,
    PERMISSIONS.REPORT_MANAGE,
    PERMISSIONS.REPORT_DISMISS,
    
    // System
    PERMISSIONS.ADMIN_READ,
    PERMISSIONS.AUDIT_READ,
    PERMISSIONS.ANALYTICS_VIEW,
    PERMISSIONS.NOTIFICATION_SEND_ALL,
    
    // Other resources
    PERMISSIONS.EVENT_CREATE,
    PERMISSIONS.EVENT_READ,
    PERMISSIONS.EVENT_UPDATE,
    PERMISSIONS.EVENT_DELETE,
    PERMISSIONS.JOB_CREATE,
    PERMISSIONS.JOB_READ,
    PERMISSIONS.JOB_UPDATE,
    PERMISSIONS.JOB_DELETE,
    PERMISSIONS.DONATION_CREATE,
    PERMISSIONS.DONATION_READ,
    PERMISSIONS.DONATION_MANAGE,
    PERMISSIONS.MESSAGE_READ_ALL
  ],
  
  [ROLES.MODERATOR]: [
    // Limited user management
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_BAN,
    PERMISSIONS.USER_UNBAN,
    
    // Content moderation
    PERMISSIONS.POST_READ,
    PERMISSIONS.POST_DELETE,
    PERMISSIONS.POST_MODERATE,
    PERMISSIONS.COMMENT_READ,
    PERMISSIONS.COMMENT_DELETE,
    
    // Reports
    PERMISSIONS.REPORT_READ,
    PERMISSIONS.REPORT_MANAGE,
    PERMISSIONS.REPORT_DISMISS,
    
    // View only
    PERMISSIONS.EVENT_READ,
    PERMISSIONS.JOB_READ,
    PERMISSIONS.DONATION_READ
  ],
  
  [ROLES.ALUMNI]: [
    // Basic user actions
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_UPDATE_OWN,
    
    // Post creation and management
    PERMISSIONS.POST_CREATE,
    PERMISSIONS.POST_READ,
    PERMISSIONS.POST_UPDATE_OWN,
    PERMISSIONS.POST_DELETE_OWN,
    
    // Comments
    PERMISSIONS.COMMENT_CREATE,
    PERMISSIONS.COMMENT_READ,
    PERMISSIONS.COMMENT_UPDATE_OWN,
    PERMISSIONS.COMMENT_DELETE_OWN,
    
    // Messaging
    PERMISSIONS.MESSAGE_SEND,
    PERMISSIONS.MESSAGE_READ,
    
    // Events (alumni can create events)
    PERMISSIONS.EVENT_CREATE,
    PERMISSIONS.EVENT_READ,
    PERMISSIONS.EVENT_UPDATE_OWN,
    PERMISSIONS.EVENT_DELETE_OWN,
    
    // Jobs (alumni can post jobs)
    PERMISSIONS.JOB_CREATE,
    PERMISSIONS.JOB_READ,
    PERMISSIONS.JOB_UPDATE_OWN,
    PERMISSIONS.JOB_DELETE_OWN,
    
    // Donations
    PERMISSIONS.DONATION_CREATE,
    PERMISSIONS.DONATION_READ,
    
    // Connections
    PERMISSIONS.CONNECTION_REQUEST,
    PERMISSIONS.CONNECTION_READ,
    PERMISSIONS.CONNECTION_MANAGE,
    
    // Reports (can report content)
    PERMISSIONS.REPORT_CREATE,
    
    // Notifications
    PERMISSIONS.NOTIFICATION_READ
  ],
  
  [ROLES.STUDENT]: [
    // Basic user actions
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_UPDATE_OWN,
    
    // Posts
    PERMISSIONS.POST_CREATE,
    PERMISSIONS.POST_READ,
    PERMISSIONS.POST_UPDATE_OWN,
    PERMISSIONS.POST_DELETE_OWN,
    
    // Comments
    PERMISSIONS.COMMENT_CREATE,
    PERMISSIONS.COMMENT_READ,
    PERMISSIONS.COMMENT_UPDATE_OWN,
    PERMISSIONS.COMMENT_DELETE_OWN,
    
    // Messaging
    PERMISSIONS.MESSAGE_SEND,
    PERMISSIONS.MESSAGE_READ,
    
    // Events (read only)
    PERMISSIONS.EVENT_READ,
    
    // Jobs (read and apply)
    PERMISSIONS.JOB_READ,
    
    // Donations
    PERMISSIONS.DONATION_CREATE,
    PERMISSIONS.DONATION_READ,
    
    // Connections
    PERMISSIONS.CONNECTION_REQUEST,
    PERMISSIONS.CONNECTION_READ,
    PERMISSIONS.CONNECTION_MANAGE,
    
    // Reports
    PERMISSIONS.REPORT_CREATE,
    
    // Notifications
    PERMISSIONS.NOTIFICATION_READ
  ]
};

export const getPermissionsForRole = (role) => {
  const permissions = ROLE_PERMISSIONS[role] || [];
  if (permissions.includes('*')) {
    return Object.values(PERMISSIONS);
  }
  return permissions;
};

export const hasPermission = (role, permission) => {
  const permissions = getPermissionsForRole(role);
  return permissions.includes(permission) || permissions.includes('*');
};

export const hasAnyPermission = (role, permissionsList) => {
  return permissionsList.some(permission => hasPermission(role, permission));
};

export const hasAllPermissions = (role, permissionsList) => {
  return permissionsList.every(permission => hasPermission(role, permission));
};

export const ROLE_HIERARCHY = {
  [ROLES.STUDENT]: 1,
  [ROLES.ALUMNI]: 2,
  [ROLES.MODERATOR]: 3,
  [ROLES.ADMIN]: 4,
  [ROLES.SUPERADMIN]: 5
};

export const isHigherRole = (role1, role2) => {
  return (ROLE_HIERARCHY[role1] || 0) > (ROLE_HIERARCHY[role2] || 0);
};

export default {
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  ROLE_HIERARCHY,
  getPermissionsForRole,
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  isHigherRole
};
