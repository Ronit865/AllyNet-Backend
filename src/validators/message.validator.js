import { body, param, query } from 'express-validator';
import { isValidObjectId } from '../middlewares/validation.middleware.js';

/**
 * Validation rules for creating or getting a conversation
 */
export const getOrCreateConversationValidation = [
  body('participantId')
    .notEmpty()
    .withMessage('Participant ID is required')
    .custom(isValidObjectId)
    .withMessage('Invalid participant ID format')
];

/**
 * Validation rules for sending a message
 */
export const sendMessageValidation = [
  body('conversationId')
    .notEmpty()
    .withMessage('Conversation ID is required')
    .custom(isValidObjectId)
    .withMessage('Invalid conversation ID format'),
  
  body('content')
    .notEmpty()
    .withMessage('Message content is required')
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Message must be between 1 and 5000 characters')
    .custom((value) => {
      // Check if message is not just whitespace
      if (value.trim().length === 0) {
        throw new Error('Message cannot be empty or just whitespace');
      }
      return true;
    })
];

/**
 * Validation rules for getting conversation messages
 */
export const getConversationMessagesValidation = [
  param('conversationId')
    .notEmpty()
    .withMessage('Conversation ID is required')
    .custom(isValidObjectId)
    .withMessage('Invalid conversation ID format'),
  
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

/**
 * Validation rules for marking messages as read
 */
export const markMessagesAsReadValidation = [
  param('conversationId')
    .notEmpty()
    .withMessage('Conversation ID is required')
    .custom(isValidObjectId)
    .withMessage('Invalid conversation ID format')
];

/**
 * Validation rules for deleting a message
 */
export const deleteMessageValidation = [
  param('messageId')
    .notEmpty()
    .withMessage('Message ID is required')
    .custom(isValidObjectId)
    .withMessage('Invalid message ID format')
];

/**
 * Validation rules for getting user conversations
 */
export const getUserConversationsValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
];

/**
 * Validation rules for searching messages
 */
export const searchMessagesValidation = [
  query('q')
    .notEmpty()
    .withMessage('Search query is required')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Search query must be between 2 and 100 characters'),
  
  query('conversationId')
    .optional()
    .custom(isValidObjectId)
    .withMessage('Invalid conversation ID format')
];

export default {
  getOrCreateConversationValidation,
  sendMessageValidation,
  getConversationMessagesValidation,
  markMessagesAsReadValidation,
  deleteMessageValidation,
  getUserConversationsValidation,
  searchMessagesValidation
};
