export const ROLES = {
  SUPERADMIN: 'superadmin',
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  ALUMNI: 'alumni',
  STUDENT: 'student'
};

export const BAN_STATUS = {
  ACTIVE: 'active',
  TEMP_BANNED: 'temp_banned',
  SUSPENDED: 'suspended'
};

export const isAdmin = (role) => ['superadmin', 'admin', 'moderator'].includes(role);
