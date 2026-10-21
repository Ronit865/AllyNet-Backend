import { SOCKET_EVENTS, USER_STATUS } from '../../config/socket.config.js';
import { setCache, getCache, deleteCache, REDIS_KEYS, CACHE_TTL } from '../../config/redis.config.js';
import logger from '../../config/winston.config.js';

/**
 * Register presence-related socket event handlers
 * @param {Object} socket - Socket instance
 * @param {Object} io - Socket.io server instance
 */
export const registerPresenceHandlers = (socket, io) => {
  const user = socket.user;
  const userId = user._id.toString();
  
  /**
   * Update user presence on connection
   */
  const updateUserPresence = async (status = USER_STATUS.ONLINE) => {
    try {
      const presenceData = {
        userId,
        status,
        lastSeen: new Date(),
        userName: user.name,
        userAvatar: user.avatar
      };
      
      // Store in Redis with TTL
      const presenceKey = `${REDIS_KEYS.USER_PRESENCE}${userId}`;
      await setCache(presenceKey, presenceData, CACHE_TTL.LONG);
      
      // Broadcast to all users
      io.emit(SOCKET_EVENTS.PRESENCE_UPDATE, presenceData);
      
    } catch (error) {
      logger.error('Error updating user presence:', {
        error: error.message,
        userId
      });
    }
  };
  
  // Set user online on connection
  updateUserPresence(USER_STATUS.ONLINE);
  
  /**
   * Handle user status change
   */
  socket.on(SOCKET_EVENTS.USER_STATUS, async (data, callback) => {
    try {
      const { status } = data;
      
      // Validate status
      const validStatuses = Object.values(USER_STATUS);
      if (!validStatuses.includes(status)) {
        return callback?.({
          success: false,
          message: 'Invalid status'
        });
      }
      
      await updateUserPresence(status);
      
      callback?.({
        success: true,
        status
      });
      
    } catch (error) {
      logger.error('Error handling user status:', {
        error: error.message,
        userId,
        data
      });
      
      callback?.({
        success: false,
        message: 'Failed to update status'
      });
    }
  });
  
  /**
   * Handle presence request (get specific users' status)
   */
  socket.on(SOCKET_EVENTS.PRESENCE_REQUEST, async (data, callback) => {
    try {
      const { userIds } = data;
      
      if (!Array.isArray(userIds)) {
        return callback?.({
          success: false,
          message: 'User IDs must be an array'
        });
      }
      
      // Get presence for requested users
      const presenceList = await Promise.all(
        userIds.map(async (uid) => {
          const presenceKey = `${REDIS_KEYS.USER_PRESENCE}${uid}`;
          const presence = await getCache(presenceKey);
          
          return presence || {
            userId: uid,
            status: USER_STATUS.OFFLINE,
            lastSeen: null
          };
        })
      );
      
      callback?.({
        success: true,
        presence: presenceList
      });
      
    } catch (error) {
      logger.error('Error handling presence request:', {
        error: error.message,
        userId,
        data
      });
      
      callback?.({
        success: false,
        message: 'Failed to get presence'
      });
    }
  });
  
  /**
   * Handle disconnection - set user offline
   */
  socket.on('disconnect', async () => {
    try {
      // Check if user has other active sockets
      const userSockets = await io.in(`user:${userId}`).allSockets();
      
      // If no other sockets, mark as offline
      if (userSockets.size === 0) {
        const presenceData = {
          userId,
          status: USER_STATUS.OFFLINE,
          lastSeen: new Date(),
          userName: user.name,
          userAvatar: user.avatar
        };
        
        // Store in Redis
        const presenceKey = `${REDIS_KEYS.USER_PRESENCE}${userId}`;
        await setCache(presenceKey, presenceData, CACHE_TTL.DAY);
        
        // Broadcast offline status
        io.emit(SOCKET_EVENTS.PRESENCE_UPDATE, presenceData);
        
        logger.debug('User set to offline', { userId });
      }
      
    } catch (error) {
      logger.error('Error handling presence on disconnect:', {
        error: error.message,
        userId
      });
    }
  });
};

/**
 * Get user presence status
 * @param {string} userId - User ID
 * @returns {Object} Presence data
 */
export const getUserPresence = async (userId) => {
  try {
    const presenceKey = `${REDIS_KEYS.USER_PRESENCE}${userId}`;
    const presence = await getCache(presenceKey);
    
    return presence || {
      userId,
      status: USER_STATUS.OFFLINE,
      lastSeen: null
    };
  } catch (error) {
    logger.error('Error getting user presence:', {
      error: error.message,
      userId
    });
    
    return {
      userId,
      status: USER_STATUS.OFFLINE,
      lastSeen: null
    };
  }
};

/**
 * Get multiple users' presence
 * @param {string[]} userIds - Array of user IDs
 * @returns {Object[]} Array of presence data
 */
export const getUsersPresence = async (userIds) => {
  try {
    return await Promise.all(
      userIds.map(userId => getUserPresence(userId))
    );
  } catch (error) {
    logger.error('Error getting users presence:', {
      error: error.message
    });
    
    return [];
  }
};

export default {
  registerPresenceHandlers,
  getUserPresence,
  getUsersPresence
};
