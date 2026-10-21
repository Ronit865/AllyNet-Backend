import { Server } from 'socket.io';
import { SOCKET_CONFIG, SOCKET_EVENTS, ROOM_PREFIXES, getRoomName } from '../config/socket.config.js';
import { getRedisClient } from '../config/redis.config.js';
import { authenticateSocket } from './auth.socket.js';
import logger, { logSecurity } from '../config/winston.config.js';

// Import handlers
import { registerMessageHandlers } from './handlers/message.handler.js';
import { registerNotificationHandlers } from './handlers/notification.handler.js';
import { registerPresenceHandlers } from './handlers/presence.handler.js';

/**
 * Socket.io server instance (singleton)
 */
let io = null;

/**
 * Connected sockets map: userId -> Set of socket IDs
 */
const userSockets = new Map();

/**
 * Initialize Socket.io server
 * @param {Object} httpServer - HTTP server instance
 * @returns {Object} Socket.io server instance
 */
export const initializeSocketIO = async (httpServer) => {
  if (io) {
    logger.warn('Socket.io already initialized');
    return io;
  }
  
  // Create Socket.io server
  io = new Server(httpServer, SOCKET_CONFIG);
  
  logger.info('Socket.io server created');
  
  // Setup Redis adapter if Redis is available
  const redisClient = getRedisClient();
  if (redisClient) {
    try {
      // Dynamically import Redis adapter only if Redis is available
      const { createAdapter } = await import('@socket.io/redis-adapter');
      const pubClient = redisClient;
      const subClient = pubClient.duplicate();
      
      io.adapter(createAdapter(pubClient, subClient));
      logger.info('Socket.io Redis adapter configured');
    } catch (error) {
      logger.error('Failed to setup Redis adapter:', { error: error.message });
      logger.warn('Socket.io will use in-memory adapter (not suitable for production scaling)');
    }
  } else {
    logger.warn('Redis not available. Socket.io using in-memory adapter');
  }
  
  // Authentication middleware
  io.use(authenticateSocket);
  
  // Connection handler
  io.on(SOCKET_EVENTS.CONNECTION, (socket) => {
    handleConnection(socket);
  });
  
  logger.info('Socket.io server initialized');
  
  return io;
};

/**
 * Handle socket connection
 * @param {Object} socket - Socket instance
 */
const handleConnection = (socket) => {
  const user = socket.user;
  const userId = user._id.toString();
  
  logger.info('User connected via socket', {
    userId,
    socketId: socket.id,
    userEmail: user.email
  });
  
  // Track user socket
  if (!userSockets.has(userId)) {
    userSockets.set(userId, new Set());
  }
  userSockets.get(userId).add(socket.id);
  
  // Join user's personal room
  const userRoom = getRoomName(ROOM_PREFIXES.USER, userId);
  socket.join(userRoom);
  
  // Store user data on socket for easy access
  socket.userId = userId;
  socket.userRole = user.role;
  
  // Send authentication success
  socket.emit(SOCKET_EVENTS.AUTH_SUCCESS, {
    userId,
    message: 'Connected successfully'
  });
  
  // Register event handlers
  registerMessageHandlers(socket, io);
  registerNotificationHandlers(socket, io);
  registerPresenceHandlers(socket, io);
  
  // Handle disconnection
  socket.on(SOCKET_EVENTS.DISCONNECT, () => {
    handleDisconnection(socket);
  });
  
  // Handle errors
  socket.on(SOCKET_EVENTS.ERROR, (error) => {
    logger.error('Socket error:', {
      userId,
      socketId: socket.id,
      error: error.message
    });
  });
  
  // Emit user online status to others
  emitUserOnline(userId);
};

/**
 * Handle socket disconnection
 * @param {Object} socket - Socket instance
 */
const handleDisconnection = (socket) => {
  const userId = socket.userId;
  
  if (!userId) return;
  
  logger.info('User disconnected', {
    userId,
    socketId: socket.id
  });
  
  // Remove socket from tracking
  if (userSockets.has(userId)) {
    userSockets.get(userId).delete(socket.id);
    
    // If user has no more sockets, emit offline status
    if (userSockets.get(userId).size === 0) {
      userSockets.delete(userId);
      emitUserOffline(userId);
    }
  }
};

/**
 * Emit user online status
 * @param {string} userId - User ID
 */
const emitUserOnline = (userId) => {
  io.emit(SOCKET_EVENTS.USER_ONLINE, {
    userId,
    status: 'online',
    timestamp: new Date()
  });
};

/**
 * Emit user offline status
 * @param {string} userId - User ID
 */
const emitUserOffline = (userId) => {
  io.emit(SOCKET_EVENTS.USER_OFFLINE, {
    userId,
    status: 'offline',
    lastSeen: new Date(),
    timestamp: new Date()
  });
};

/**
 * Get Socket.io server instance
 * @returns {Object} Socket.io server instance
 */
export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized. Call initializeSocketIO first.');
  }
  return io;
};

/**
 * Check if user is online
 * @param {string} userId - User ID
 * @returns {boolean}
 */
export const isUserOnline = (userId) => {
  return userSockets.has(userId) && userSockets.get(userId).size > 0;
};

/**
 * Get all socket IDs for a user
 * @param {string} userId - User ID
 * @returns {string[]} Array of socket IDs
 */
export const getUserSockets = (userId) => {
  const sockets = userSockets.get(userId);
  return sockets ? Array.from(sockets) : [];
};

/**
 * Get count of online users
 * @returns {number}
 */
export const getOnlineUserCount = () => {
  return userSockets.size;
};

/**
 * Get list of online user IDs
 * @returns {string[]}
 */
export const getOnlineUsers = () => {
  return Array.from(userSockets.keys());
};

/**
 * Emit event to specific user (all their sockets)
 * @param {string} userId - User ID
 * @param {string} event - Event name
 * @param {Object} data - Event data
 */
export const emitToUser = (userId, event, data) => {
  if (!io) {
    logger.warn('Cannot emit to user: Socket.io not initialized');
    return false;
  }
  
  const userRoom = getRoomName(ROOM_PREFIXES.USER, userId);
  io.to(userRoom).emit(event, data);
  
  return true;
};

/**
 * Emit event to multiple users
 * @param {string[]} userIds - Array of user IDs
 * @param {string} event - Event name
 * @param {Object} data - Event data
 */
export const emitToUsers = (userIds, event, data) => {
  if (!io) {
    logger.warn('Cannot emit to users: Socket.io not initialized');
    return false;
  }
  
  userIds.forEach(userId => {
    emitToUser(userId, event, data);
  });
  
  return true;
};

/**
 * Emit event to all connected users
 * @param {string} event - Event name
 * @param {Object} data - Event data
 */
export const emitToAll = (event, data) => {
  if (!io) {
    logger.warn('Cannot emit to all: Socket.io not initialized');
    return false;
  }
  
  io.emit(event, data);
  return true;
};

/**
 * Emit event to a specific room
 * @param {string} room - Room name
 * @param {string} event - Event name
 * @param {Object} data - Event data
 */
export const emitToRoom = (room, event, data) => {
  if (!io) {
    logger.warn('Cannot emit to room: Socket.io not initialized');
    return false;
  }
  
  io.to(room).emit(event, data);
  return true;
};

/**
 * Disconnect a specific user (all their sockets)
 * @param {string} userId - User ID
 * @param {string} reason - Disconnect reason
 */
export const disconnectUser = (userId, reason = 'Disconnected by server') => {
  if (!io) return;
  
  const socketIds = getUserSockets(userId);
  
  socketIds.forEach(socketId => {
    const socket = io.sockets.sockets.get(socketId);
    if (socket) {
      socket.disconnect(true);
      logger.info('User forcefully disconnected', { userId, socketId, reason });
    }
  });
};

/**
 * Get socket.io server statistics
 * @returns {Object} Server stats
 */
export const getSocketStats = () => {
  if (!io) {
    return {
      initialized: false
    };
  }
  
  return {
    initialized: true,
    onlineUsers: getOnlineUserCount(),
    totalSockets: io.sockets.sockets.size,
    rooms: io.sockets.adapter.rooms.size
  };
};

export default {
  initializeSocketIO,
  getIO,
  isUserOnline,
  getUserSockets,
  getOnlineUserCount,
  getOnlineUsers,
  emitToUser,
  emitToUsers,
  emitToAll,
  emitToRoom,
  disconnectUser,
  getSocketStats
};
