import express from 'express';
import { sendBulkEmails, getEmailHistory } from '../controllers/email.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';
import { emailLimiter } from '../middlewares/rateLimiter.middleware.js';
import { validatePagination } from '../middlewares/validation.middleware.js';
import { PERMISSIONS } from '../config/permissions.config.js';

const router = express.Router();

router.use(authenticate);
router.use(requirePermission(PERMISSIONS.NOTIFICATION_SEND_ALL));

router.post("/sendEmail", emailLimiter, sendBulkEmails);
router.get("/history", validatePagination, getEmailHistory);

export default router;
