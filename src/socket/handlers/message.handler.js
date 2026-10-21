import { SOCKET_EVENTS, ROOM_PREFIXES, getRoomName, TYPING_TIMEOUT } from '../../config/socket.config.js';
import { Message } from '../../models/message.model.js';
import { Conversation } from '../../models/conversation.model.js';
import { Notification } from '../../models/notification.model.js';
import { containsInappropriateContent } from '../../utils/contentFilter.js';
import logger from '../../config/winston.config.js';

// Store typing indicators timeout IDs
const typingTimeouts = new Map();

/**
 * Register message-related socket event handlers
 * @param {Object} socket - Socket instance
 * @param {Object} io - Socket.io server instance
 */
export const registerMessageHandlers = (socket, io) => {
  const user = socket.user;
  const userId = user._id.toString();
  
  /**
   * Send message via socket
   * Real-time message delivery
   */
  socket.on(SOCKET_EVENTS.MESSAGE_SEND, async (data, callback) => {
    try {
      const { conversationId, content } = data;
      
      // Validation
      if (!conversationId || !content) {
        return callback({
          success: false,
          message: 'Conversation ID and content are required'
        });
      }
      
      if (!content.trim()) {
        return callback({
          success: false,
          message: 'Message cannot be empty'
        });
      }
      
      if (content.length > 5000) {
        return callback({
          success: false,
          message: 'Message too long (max 5000 characters)'
        });
      }
      
      // Check for inappropriate content
      if (containsInappropriateContent(content)) {
        return callback({
          success: false,
          message: 'Your message contains inappropriate content'
        });
      }
      
      // Check ban status
      if (user.banStatus !== 'active') {
        return callback({
          success: false,
          message: 'You cannot send messages while banned'
        });
      }
      
      // Verify conversation exists and user is participant
      const conversation = await Conversation.findById(conversationId);
      
      if (!conversation) {
        return callback({
          success: false,
          message: 'Conversation not found'
        });
      }
      
      const isParticipant = conversation.participants.some(
        p => p.toString() === userId
      );
      
      if (!isParticipant) {
        return callback({
          success: false,
          message: 'You are not a participant in this conversation'
        });
      }
      
      // Create message
      const message = await Message.create({
        conversation: conversationId,
        sender: userId,
        content: content.trim()
      });
      
      // Update conversation
      conversation.lastMessage = message._id;
      conversation.lastMessageTime = message.createdAt;
      await conversation.save();
      
      // Populate message for response
      await message.populate('sender', 'name avatar email');
      
      // Get recipient (other participant)
      const recipientId = conversation.participants.find(
        p => p.toString() !== userId
      );
      
      // Emit to conversation room
      const conversationRoom = getRoomName(ROOM_PREFIXES.CONVERSATION, conversationId);
      io.to(conversationRoom).emit(SOCKET_EVENTS.MESSAGE_NEW, {
        message,
        conversationId
      });
      
      // Emit to recipient's personal room (for notifications)
      if (recipientId) {
        const recipientRoom = getRoomName(ROOM_PREFIXES.USER, recipientId.toString());
        io.to(recipientRoom).emit(SOCKET_EVENTS.MESSAGE_NEW, {
          message,
          conversationId
        });
        
        // Create notification
        await Notification.create({
          recipient: recipientId,
          sender: userId,
          type: 'message',
          title: 'New Message',
          message: `${user.name} sent you a message`
        });
        
        // Emit notification event
        io.to(recipientRoom).emit(SOCKET_EVENTS.NOTIFICATION_NEW, {
          type: 'message',
          title: 'New Message',
          message: `${user.name} sent you a message`,
          from: {
            _id: userId,
            name: user.name,
            avatar: user.avatar
          }
        });
      }
      
      // Send success callback
      callback({
        success: true,
        message: message
      });
      
      logger.info('Message sent via socket', {
        messageId: message._id,
        conversationId,
        senderId: userId
      });
      
    } catch (error) {
      logger.error('Error sending message via socket:', {
        error: error.message,
        userId,
        data
      });
      
      callback({
        success: false,
        message: 'Failed to send message'
      });
    }
  });
  
  /**
   * Mark message as read
   */
  socket.on(SOCKET_EVENTS.MESSAGE_READ, async (data, callback) => {
    try {
      const { messageId, conversationId } = data;
      
      if (messageId) {
        // Mark specific message as read
        const message = await Message.findById(messageId);
        
        if (message && message.sender.toString() !== userId) {
          message.read = true;
          message.readAt = new Date();
          await message.save();
          
          // Notify sender
          const senderRoom = getRoomName(ROOM_PREFIXES.USER, message.sender.toString());
          io.to(senderRoom).emit(SOCKET_EVENTS.MESSAGE_READ, {
            messageId,
            readBy: userId,
            readAt: message.readAt
          });
        }
      } else if (conversationId) {
        // Mark all messages in conversation as read
        await Message.updateMany(
          {
            conversation: conversationId,
            sender: { $ne: userId },
            read: false
          },
          {
            read: true,
            readAt: new Date()
          }
        );
      }
      
      if (callback) {
        callback({ success: true });
      }
      
    } catch (error) {
      logger.error('Error marking message as read:', {
        error: error.message,
        userId,
        data
      });
      
      if (callback) {
        callback({ success: false, message: 'Failed to mark as read' });
      }
    }
  });
  
  /**
   * Typing indicator start
   */
  socket.on(SOCKET_EVENTS.TYPING_START, async (data) => {
    try {
      const { conversationId } = data;
      
      if (!conversationId) return;
      
      // Verify user is participant
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) return;
      
      const isParticipant = conversation.participants.some(
        p => p.toString() === userId
      );
      
      if (!isParticipant) return;
      
      // Emit to conversation room (except sender)
      const conversationRoom = getRoomName(ROOM_PREFIXES.CONVERSATION, conversationId);
      socket.to(conversationRoom).emit(SOCKET_EVENTS.TYPING_INDICATOR, {
        conversationId,
        userId,
        userName: user.name,
        isTyping: true
      });
      
      // Clear existing timeout
      const timeoutKey = `${userId}:${conversationId}`;
      if (typingTimeouts.has(timeoutKey)) {
        clearTimeout(typingTimeouts.get(timeoutKey));
      }
      
      // Auto-stop typing after timeout
      const timeout = setTimeout(() => {
        socket.to(conversationRoom).emit(SOCKET_EVENTS.TYPING_INDICATOR, {
          conversationId,
          userId,
          userName: user.name,
          isTyping: false
        });
        typingTimeouts.delete(timeoutKey);
      }, TYPING_TIMEOUT);
      
      typingTimeouts.set(timeoutKey, timeout);
      
    } catch (error) {
      logger.error('Error handling typing start:', {
        error: error.message,
        userId,
        data
      });
    }
  });
  
  /**
   * Typing indicator stop
   */
  socket.on(SOCKET_EVENTS.TYPING_STOP, async (data) => {
    try {
      const { conversationId } = data;
      
      if (!conversationId) return;
      
      // Emit to conversation room (except sender)
      const conversationRoom = getRoomName(ROOM_PREFIXES.CONVERSATION, conversationId);
      socket.to(conversationRoom).emit(SOCKET_EVENTS.TYPING_INDICATOR, {
        conversationId,
        userId,
        userName: user.name,
        isTyping: false
      });
      
      // Clear timeout
      const timeoutKey = `${userId}:${conversationId}`;
      if (typingTimeouts.has(timeoutKey)) {
        clearTimeout(typingTimeouts.get(timeoutKey));
        typingTimeouts.delete(timeoutKey);
      }
      
    } catch (error) {
      logger.error('Error handling typing stop:', {
        error: error.message,
        userId,
        data
      });
    }
  });
  
  /**
   * Join conversation room
   */
  socket.on(SOCKET_EVENTS.JOIN_ROOM, async (data) => {
    try {
      const { conversationId } = data;
      
      if (!conversationId) return;
      
      // Verify user is participant
      const conversation = await Conversation.findById(conversationId);
      if (!conversation) return;
      
      const isParticipant = conversation.participants.some(
        p => p.toString() === userId
      );
      
      if (!isParticipant) return;
      
      const conversationRoom = getRoomName(ROOM_PREFIXES.CONVERSATION, conversationId);
      socket.join(conversationRoom);
      
      logger.debug('User joined conversation room', {
        userId,
        conversationId,
        socketId: socket.id
      });
      
    } catch (error) {
      logger.error('Error joining conversation room:', {
        error: error.message,
        userId,
        data
      });
    }
  });
  
  /**
   * Leave conversation room
   */
  socket.on(SOCKET_EVENTS.LEAVE_ROOM, (data) => {
    try {
      const { conversationId } = data;
      
      if (!conversationId) return;
      
      const conversationRoom = getRoomName(ROOM_PREFIXES.CONVERSATION, conversationId);
      socket.leave(conversationRoom);
      
      logger.debug('User left conversation room', {
        userId,
        conversationId,
        socketId: socket.id
      });
      
    } catch (error) {
      logger.error('Error leaving conversation room:', {
        error: error.message,
        userId,
        data
      });
    }
  });
};

export default {
  registerMessageHandlers
};
