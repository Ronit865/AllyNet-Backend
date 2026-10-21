import { SOCKET_EVENTS, ROOM_PREFIXES, getRoomName } from '../../config/socket.config.js';
import { Notification } from '../../models/notification.model.js';
import logger from '../../config/winston.config.js';

/**
 * Register notification-related socket event handlers
 * @param {Object} socket - Socket instance
 * @param {Object} io - Socket.io server instance
 */
export const registerNotificationHandlers = (socket, io) => {
  const user = socket.user;
  const userId = user._id.toString();
  
  /**
   * Mark notification as read
   */
  socket.on(SOCKET_EVENTS.NOTIFICATION_READ, async (data, callback) => {
    try {
      const { notificationId } = data;
      
      if (!notificationId) {
        return callback?.({
          success: false,
          message: 'Notification ID is required'
        });
      }
      
      // Find and update notification
      const notification = await Notification.findOne({
        _id: notificationId,
        recipient: userId
      });
      
      if (!notification) {
        return callback?.({
          success: false,
          message: 'Notification not found'
        });
      }
      
      notification.read = true;
      await notification.save();
      
      // Get updated unread count
      const unreadCount = await Notification.countDocuments({
        recipient: userId,
        read: false
      });
      
      // Emit updated count to user
      const userRoom = getRoomName(ROOM_PREFIXES.USER, userId);
      io.to(userRoom).emit(SOCKET_EVENTS.NOTIFICATION_COUNT, {
        unreadCount
      });
      
      callback?.({
        success: true,
        unreadCount
      });
      
    } catch (error) {
      logger.error('Error marking notification as read:', {
        error: error.message,
        userId,
        data
      });
      
      callback?.({
        success: false,
        message: 'Failed to mark notification as read'
      });
    }
  });
  
  /**
   * Get unread notification count
   */
  socket.on('notification:getCount', async (data, callback) => {
    try {
      const unreadCount = await Notification.countDocuments({
        recipient: userId,
        read: false
      });
      
      callback?.({
        success: true,
        unreadCount
      });
      
    } catch (error) {
      logger.error('Error getting notification count:', {
        error: error.message,
        userId
      });
      
      callback?.({
        success: false,
        message: 'Failed to get notification count'
      });
    }
  });
};

/**
 * Send notification to user via socket
 * Helper function to be called from controllers
 * 
 * @param {Object} io - Socket.io instance
 * @param {string} recipientId - Recipient user ID
 * @param {Object} notificationData - Notification data
 */
export const sendNotificationViaSocket = (io, recipientId, notificationData) => {
  try {
    const userRoom = getRoomName(ROOM_PREFIXES.USER, recipientId);
    
    io.to(userRoom).emit(SOCKET_EVENTS.NOTIFICATION_NEW, notificationData);
    
    logger.debug('Notification sent via socket', {
      recipientId,
      type: notificationData.type
    });
    
    return true;
  } catch (error) {
    logger.error('Error sending notification via socket:', {
      error: error.message,
      recipientId
    });
    
    return false;
  }
};

/**
 * Update notification count for user
 * @param {Object} io - Socket.io instance
 * @param {string} userId - User ID
 * @param {number} unreadCount - Unread count
 */
export const updateNotificationCount = (io, userId, unreadCount) => {
  try {
    const userRoom = getRoomName(ROOM_PREFIXES.USER, userId);
    
    io.to(userRoom).emit(SOCKET_EVENTS.NOTIFICATION_COUNT, {
      unreadCount
    });
    
    return true;
  } catch (error) {
    logger.error('Error updating notification count:', {
      error: error.message,
      userId
    });
    
    return false;
  }
};

export default {
  registerNotificationHandlers,
  sendNotificationViaSocket,
  updateNotificationCount
};
