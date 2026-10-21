import { Router } from "express";
import {
  sendConnectionRequest,
  getConnectionStatus,
  getConnections,
  getPendingRequests,
  acceptConnectionRequest,
  rejectConnectionRequest,
  removeConnection
} from "../controllers/connection.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { requireNotBanned } from "../middlewares/banCheck.middleware.js";
import { connectionRequestLimiter, generalLimiter } from "../middlewares/rateLimiter.middleware.js";
import { requirePermission } from "../middlewares/rbac.middleware.js";
import { PERMISSIONS } from "../config/permissions.config.js";
import { validatePagination } from "../middlewares/validation.middleware.js";

const router = Router();

router.use(authenticate);

router.post("/request", requireNotBanned, requirePermission(PERMISSIONS.CONNECTION_REQUEST), connectionRequestLimiter, sendConnectionRequest);
router.get("/requests", generalLimiter, validatePagination, getPendingRequests);
router.post("/accept/:connectionId", requireNotBanned, requirePermission(PERMISSIONS.CONNECTION_MANAGE), generalLimiter, acceptConnectionRequest);
router.post("/reject/:connectionId", requireNotBanned, requirePermission(PERMISSIONS.CONNECTION_MANAGE), generalLimiter, rejectConnectionRequest);
router.get("/", generalLimiter, validatePagination, getConnections);
router.get("/status/:userId", generalLimiter, getConnectionStatus);
router.delete("/:connectionId", requirePermission(PERMISSIONS.CONNECTION_MANAGE), removeConnection);

export default router;
