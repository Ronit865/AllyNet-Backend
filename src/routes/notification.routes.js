import express from "express";
import { getNotifications, markAsRead, markAllAsRead, deleteNotification, getUnreadCount } from "../controllers/notification.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { generalLimiter } from "../middlewares/rateLimiter.middleware.js";
import { validatePagination } from "../middlewares/validation.middleware.js";

const router = express.Router();

router.use(authenticate);
router.use(generalLimiter);

router.get("/", validatePagination, getNotifications);
router.patch("/:notificationId/read", markAsRead);
router.patch("/read-all", markAllAsRead);
router.delete("/:notificationId", deleteNotification);
router.get("/unread/count", getUnreadCount);

export default router;
