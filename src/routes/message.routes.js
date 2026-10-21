import express from "express";
import {
  getOrCreateConversation,
  getUserConversations,
  sendMessage,
  getConversationMessages,
  markMessagesAsRead,
  getUnreadCount,
  deleteMessage
} from "../controllers/message.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { messageLimiter } from "../middlewares/rateLimiter.middleware.js";
import { requireNotBanned } from "../middlewares/banCheck.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import {
  getOrCreateConversationValidation,
  sendMessageValidation,
  getConversationMessagesValidation,
  markMessagesAsReadValidation,
  deleteMessageValidation,
  getUserConversationsValidation
} from "../validators/message.validator.js";

const router = express.Router();

router.use(authenticate);
router.use(messageLimiter);

router.post("/conversation", requireNotBanned, getOrCreateConversationValidation, validate, getOrCreateConversation);
router.get("/conversations", getUserConversationsValidation, validate, getUserConversations);
router.post("/send", requireNotBanned, sendMessageValidation, validate, sendMessage);
router.get("/conversation/:conversationId", getConversationMessagesValidation, validate, getConversationMessages);
router.patch("/conversation/:conversationId/read", markMessagesAsReadValidation, validate, markMessagesAsRead);
router.get("/unread-count", getUnreadCount);
router.delete("/:messageId", deleteMessageValidation, validate, deleteMessage);

export default router;
