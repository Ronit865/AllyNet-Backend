import express from 'express';
import { authenticate, optionalAuth } from '../middlewares/auth.middleware.js';
import { requirePermission, requireOwnershipOrPermission } from '../middlewares/rbac.middleware.js';
import { requireNotBanned } from '../middlewares/banCheck.middleware.js';
import { generalLimiter } from '../middlewares/rateLimiter.middleware.js';
import { PERMISSIONS } from '../config/permissions.config.js';
import { addEvent, createEventPaymentOrder, deleteEvent, eventParticipants, getEvents, updateEvent, userEventJoin, userEventLeave, verifyEventPayment } from '../controllers/event.controller.js';

const router = express.Router();

router.get("/getEvents", optionalAuth, generalLimiter, getEvents);
router.get("/getEventParticipants/:eventID", optionalAuth, generalLimiter, eventParticipants);

router.post("/addEvent", authenticate, requireNotBanned, requirePermission(PERMISSIONS.EVENT_CREATE), generalLimiter, addEvent);
router.patch("/editEvent/:id", authenticate, requireNotBanned, requireOwnershipOrPermission('event', 'id', async (eventId) => {
  const { Event } = await import('../models/event.model.js');
  const event = await Event.findById(eventId);
  return event?.createdBy || event?.creator;
}, PERMISSIONS.EVENT_UPDATE), generalLimiter, updateEvent);
router.delete("/deleteEvent/:_id", authenticate, requireOwnershipOrPermission('event', '_id', async (eventId) => {
  const { Event } = await import('../models/event.model.js');
  const event = await Event.findById(eventId);
  return event?.createdBy || event?.creator;
}, PERMISSIONS.EVENT_DELETE), generalLimiter, deleteEvent);
router.post("/addUserToEvent/:eventID", authenticate, requireNotBanned, generalLimiter, userEventJoin);
router.post("/payment/order/:eventID", authenticate, requireNotBanned, generalLimiter, createEventPaymentOrder);
router.post("/payment/verify/:eventID", authenticate, requireNotBanned, generalLimiter, verifyEventPayment);
router.post("/removeUserFromEvent/:eventID", authenticate, generalLimiter, userEventLeave);

export default router;
