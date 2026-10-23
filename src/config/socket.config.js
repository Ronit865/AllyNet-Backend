/**
 * Socket.io Configuration
 * Defines socket connection settings, CORS, and Redis adapter configuration
 */

export const SOCKET_CONFIG = {
  cors: {
    origin: [
      'https://allynet-app.vercel.app',
      'http://localhost:5173',
      'https://allynet.lovable.app'
    ],
    credentials: true,
    methods: ['GET', 'POST']
  },
  
  // Connection settings
  pingTimeout: 60000, // 60 seconds
  pingInterval: 25000, // 25 seconds
  upgradeTimeout: 10000, // 10 seconds
  maxHttpBufferSize: 1e6, // 1 MB
  
  // Transport options
  transports: ['websocket', 'polling'],
  
  // Allow upgrades from HTTP long-polling to WebSocket
  allowUpgrades: true,
  
  // Cookie settings
  cookie: {
    name: 'io',
    httpOnly: true,
    sameSite: 'lax'
  }
};

/**
 * Redis Adapter Configuration
 * Used for scaling Socket.io across multiple servers
 */
export const REDIS_CONFIG = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB) || 0,
  
  // Connection retry strategy
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  
  // Connection timeout
  connectTimeout: 10000,
  
  // Keep alive
  keepAlive: 30000
};

/**
 * Socket Event Names
 * Centralized event name constants to prevent typos
 */
export const SOCKET_EVENTS = {
  // Connection events
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  ERROR: 'error',
  CONNECT_ERROR: 'connect_error',
  
  // Authentication events
  AUTH: 'auth',
  AUTH_SUCCESS: 'auth:success',
  AUTH_ERROR: 'auth:error',
  
  // Message events
  MESSAGE_SEND: 'message:send',
  MESSAGE_NEW: 'message:new',
  MESSAGE_DELIVERED: 'message:delivered',
  MESSAGE_READ: 'message:read',
  MESSAGE_DELETE: 'message:delete',
  MESSAGE_ERROR: 'message:error',
  
  // Typing indicator events
  TYPING_START: 'typing:start',
  TYPING_STOP: 'typing:stop',
  TYPING_INDICATOR: 'typing:indicator',
  
  // Notification events
  NOTIFICATION_NEW: 'notification:new',
  NOTIFICATION_READ: 'notification:read',
  NOTIFICATION_COUNT: 'notification:count',
  
  // Presence events
  USER_ONLINE: 'user:online',
  USER_OFFLINE: 'user:offline',
  USER_STATUS: 'user:status',
  PRESENCE_REQUEST: 'presence:request',
  PRESENCE_UPDATE: 'presence:update',
  PRESENCE_LIST: 'presence:list',
  
  // Feed events
  POST_NEW: 'post:new',
  POST_UPDATE: 'post:update',
  POST_DELETE: 'post:delete',
  COMMENT_NEW: 'comment:new',
  
  // Connection request events
  CONNECTION_REQUEST: 'connection:request',
  CONNECTION_ACCEPTED: 'connection:accepted',
  CONNECTION_REJECTED: 'connection:rejected',
  
  // Room events
  JOIN_ROOM: 'room:join',
  LEAVE_ROOM: 'room:leave',
  
  // Error events
  VALIDATION_ERROR: 'validation:error',
  PERMISSION_ERROR: 'permission:error'
};

/**
 * Socket Room Prefixes
 * Used to namespace different types of rooms
 */
export const ROOM_PREFIXES = {
  USER: 'user:',
  CONVERSATION: 'conversation:',
  POST: 'post:',
  EVENT: 'event:',
  GLOBAL: 'global'
};

/**
 * Helper function to generate room names
 */
export const getRoomName = (prefix, id) => {
  return `${prefix}${id}`;
};

/**
 * User status types
 */
export const USER_STATUS = {
  ONLINE: 'online',
  OFFLINE: 'offline',
  AWAY: 'away',
  BUSY: 'busy'
};

/**
 * Typing indicator timeout (milliseconds)
 * Auto-stop typing after this duration
 */
export const TYPING_TIMEOUT = 3000; // 3 seconds

/**
 * Maximum number of sockets per user
 * Prevents abuse by limiting connections
 */
export const MAX_SOCKETS_PER_USER = 5;

/**
 * Socket.io Namespace Configuration
 * Define different namespaces for different features
 */
export const NAMESPACES = {
  DEFAULT: '/',
  CHAT: '/chat',
  NOTIFICATIONS: '/notifications',
  ADMIN: '/admin'
};

export default {
  SOCKET_CONFIG,
  REDIS_CONFIG,
  SOCKET_EVENTS,
  ROOM_PREFIXES,
  USER_STATUS,
  TYPING_TIMEOUT,
  MAX_SOCKETS_PER_USER,
  NAMESPACES,
  getRoomName
};
