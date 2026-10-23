import express from 'express';
import { authenticate, optionalAuth } from '../middlewares/auth.middleware.js';
import { requirePermission } from '../middlewares/rbac.middleware.js';
import { requireNotBanned } from '../middlewares/banCheck.middleware.js';
import { generalLimiter } from '../middlewares/rateLimiter.middleware.js';
import { validatePagination } from '../middlewares/validation.middleware.js';
import { PERMISSIONS } from '../config/permissions.config.js';
import { addCampaign, createDonationPaymentOrder, deleteCampaign, donationAmount, editCampaign, getCampaignDonors, getCampaigns, getRecentDonors, getDonationStats, verifyDonationPayment } from '../controllers/donation.controller.js';

const router = express.Router();

router.get("/getDonations", optionalAuth, generalLimiter, validatePagination, getCampaigns);
router.get("/getDonors/:id", optionalAuth, generalLimiter, getCampaignDonors);
router.get("/recent-donors", optionalAuth, generalLimiter, getRecentDonors);
router.get("/stats", optionalAuth, generalLimiter, getDonationStats);
router.get("/getDonationStats", optionalAuth, generalLimiter, getDonationStats);
router.post("/donate/:id", authenticate, requireNotBanned, requirePermission(PERMISSIONS.DONATION_CREATE), generalLimiter, donationAmount);
router.post("/donationAmount/:id", authenticate, requireNotBanned, requirePermission(PERMISSIONS.DONATION_CREATE), generalLimiter, donationAmount);
router.post("/payment/order/:id", authenticate, requireNotBanned, requirePermission(PERMISSIONS.DONATION_CREATE), generalLimiter, createDonationPaymentOrder);
router.post("/payment/verify/:id", authenticate, requireNotBanned, requirePermission(PERMISSIONS.DONATION_CREATE), generalLimiter, verifyDonationPayment);
router.post("/addDonation", authenticate, requirePermission(PERMISSIONS.DONATION_MANAGE), generalLimiter, addCampaign);
router.patch("/editDonation/:id", authenticate, requirePermission(PERMISSIONS.DONATION_MANAGE), generalLimiter, editCampaign);
router.delete("/deleteDonation/:id", authenticate, requirePermission(PERMISSIONS.DONATION_MANAGE), generalLimiter, deleteCampaign);

export default router;
