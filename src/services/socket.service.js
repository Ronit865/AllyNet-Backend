import { getIO, emitToUser, emitToUsers, emitToAll, isUserOnline } from '../socket/socket.js';
import { SOCKET_EVENTS } from '../config/socket.config.js';
import logger from '../config/winston.config.js';

/**
 * Socket Service
 * Provides helper functions for controllers to emit socket events
 */

/**
 * Emit new message notification
 * @param {string} recipientId - Recipient user ID
 * @param {Object} messageData - Message data
 */
export const emitNewMessage = (recipientId, messageData) => {
  try {
    return emitToUser(recipientId, SOCKET_EVENTS.MESSAGE_NEW, messageData);
  } catch (error) {
    logger.error('Error emitting new message:', { error: error.message, recipientId });
    return false;
  }
};

/**
 * Emit new notification
 * @param {string} recipientId - Recipient user ID
 * @param {Object} notificationData - Notification data
 */
export const emitNewNotification = (recipientId, notificationData) => {
  try {
    return emitToUser(recipientId, SOCKET_EVENTS.NOTIFICATION_NEW, notificationData);
  } catch (error) {
    logger.error('Error emitting new notification:', { error: error.message, recipientId });
    return false;
  }
};

/**
 * Emit notification count update
 * @param {string} userId - User ID
 * @param {number} unreadCount - Unread notification count
 */
export const emitNotificationCount = (userId, unreadCount) => {
  try {
    return emitToUser(userId, SOCKET_EVENTS.NOTIFICATION_COUNT, { unreadCount });
  } catch (error) {
    logger.error('Error emitting notification count:', { error: error.message, userId });
    return false;
  }
};

/**
 * Emit new post to all users
 * @param {Object} postData - Post data
 */
export const emitNewPost = (postData) => {
  try {
    return emitToAll(SOCKET_EVENTS.POST_NEW, postData);
  } catch (error) {
    logger.error('Error emitting new post:', { error: error.message });
    return false;
  }
};

/**
 * Emit post update
 * @param {Object} postData - Updated post data
 */
export const emitPostUpdate = (postData) => {
  try {
    return emitToAll(SOCKET_EVENTS.POST_UPDATE, postData);
  } catch (error) {
    logger.error('Error emitting post update:', { error: error.message });
    return false;
  }
};

/**
 * Emit post deletion
 * @param {string} postId - Post ID
 */
export const emitPostDelete = (postId) => {
  try {
    return emitToAll(SOCKET_EVENTS.POST_DELETE, { postId });
  } catch (error) {
    logger.error('Error emitting post delete:', { error: error.message });
    return false;
  }
};

/**
 * Emit new comment notification
 * @param {string} recipientId - Post author ID
 * @param {Object} commentData - Comment data
 */
export const emitNewComment = (recipientId, commentData) => {
  try {
    return emitToUser(recipientId, SOCKET_EVENTS.COMMENT_NEW, commentData);
  } catch (error) {
    logger.error('Error emitting new comment:', { error: error.message, recipientId });
    return false;
  }
};

/**
 * Emit connection request
 * @param {string} recipientId - Request recipient ID
 * @param {Object} requestData - Connection request data
 */
export const emitConnectionRequest = (recipientId, requestData) => {
  try {
    return emitToUser(recipientId, SOCKET_EVENTS.CONNECTION_REQUEST, requestData);
  } catch (error) {
    logger.error('Error emitting connection request:', { error: error.message, recipientId });
    return false;
  }
};

/**
 * Emit connection accepted
 * @param {string} recipientId - Original requester ID
 * @param {Object} connectionData - Connection data
 */
export const emitConnectionAccepted = (recipientId, connectionData) => {
  try {
    return emitToUser(recipientId, SOCKET_EVENTS.CONNECTION_ACCEPTED, connectionData);
  } catch (error) {
    logger.error('Error emitting connection accepted:', { error: error.message, recipientId });
    return false;
  }
};

/**
 * Emit connection rejected
 * @param {string} recipientId - Original requester ID
 * @param {Object} connectionData - Connection data
 */
export const emitConnectionRejected = (recipientId, connectionData) => {
  try {
    return emitToUser(recipientId, SOCKET_EVENTS.CONNECTION_REJECTED, connectionData);
  } catch (error) {
    logger.error('Error emitting connection rejected:', { error: error.message, recipientId });
    return false;
  }
};

/**
 * Emit message read receipt
 * @param {string} senderId - Original message sender ID
 * @param {Object} readData - Read receipt data
 */
export const emitMessageRead = (senderId, readData) => {
  try {
    return emitToUser(senderId, SOCKET_EVENTS.MESSAGE_READ, readData);
  } catch (error) {
    logger.error('Error emitting message read:', { error: error.message, senderId });
    return false;
  }
};

/**
 * Check if user is currently online
 * @param {string} userId - User ID
 * @returns {boolean}
 */
export const checkUserOnline = (userId) => {
  try {
    return isUserOnline(userId);
  } catch (error) {
    logger.error('Error checking user online:', { error: error.message, userId });
    return false;
  }
};

/**
 * Emit to multiple users (bulk notification)
 * @param {string[]} userIds - Array of user IDs
 * @param {string} event - Event name
 * @param {Object} data - Event data
 */
export const emitToMultipleUsers = (userIds, event, data) => {
  try {
    return emitToUsers(userIds, event, data);
  } catch (error) {
    logger.error('Error emitting to multiple users:', { error: error.message });
    return false;
  }
};

/**
 * Broadcast system announcement to all users
 * @param {Object} announcementData - Announcement data
 */
export const broadcastAnnouncement = (announcementData) => {
  try {
    return emitToAll('system:announcement', announcementData);
  } catch (error) {
    logger.error('Error broadcasting announcement:', { error: error.message });
    return false;
  }
};

/**
 * Force disconnect user (for bans, security)
 * @param {string} userId - User ID to disconnect
 * @param {string} reason - Disconnect reason
 */
export const forceDisconnectUser = async (userId, reason = 'Account restricted') => {
  try {
    const io = getIO();
    
    // Emit disconnect warning to user
    emitToUser(userId, 'force:disconnect', {
      reason,
      message: 'You will be disconnected shortly'
    });
    
    // Give user time to see message, then disconnect
    setTimeout(() => {
      const sockets = io.sockets.sockets;
      sockets.forEach((socket) => {
        if (socket.userId === userId) {
          socket.disconnect(true);
        }
      });
    }, 2000);
    
    return true;
  } catch (error) {
    logger.error('Error force disconnecting user:', { error: error.message, userId });
    return false;
  }
};

/**
 * Emit new job posting to all users
 * @param {Object} jobData - Job data
 */
export const emitNewJob = (jobData) => {
  try {
    return emitToAll('job:new', jobData);
  } catch (error) {
    logger.error('Error emitting new job:', { error: error.message });
    return false;
  }
};

/**
 * Emit job application notification to job poster
 * @param {string} posterId - Job poster user ID
 * @param {Object} applicationData - Application data
 */
export const emitJobApplication = (posterId, applicationData) => {
  try {
    return emitToUser(posterId, 'job:application', applicationData);
  } catch (error) {
    logger.error('Error emitting job application:', { error: error.message, posterId });
    return false;
  }
};

export default {
  emitNewMessage,
  emitNewNotification,
  emitNotificationCount,
  emitNewPost,
  emitPostUpdate,
  emitPostDelete,
  emitNewComment,
  emitNewJob,
  emitJobApplication,
  emitConnectionRequest,
  emitConnectionAccepted,
  emitConnectionRejected,
  emitMessageRead,
  checkUserOnline,
  emitToMultipleUsers,
  broadcastAnnouncement,
  forceDisconnectUser
};
