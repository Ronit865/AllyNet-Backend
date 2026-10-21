import express from 'express';
import { forgotPassword, login, logout, refreshAccessToken, resetPassword, verifyOTP } from "../controllers/login.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { authLimiter, emailLimiter, checkFailedLoginAttempts } from '../middlewares/rateLimiter.middleware.js';
import { validate } from '../middlewares/validation.middleware.js';
import { loginValidation, forgotPasswordValidation, resetPasswordValidation, verifyEmailValidation } from '../validators/auth.validator.js';

const router = express.Router();

router.post("/login", authLimiter, checkFailedLoginAttempts, loginValidation, validate, login);
router.post("/logout", authenticate, logout);
router.post("/forgot-password", emailLimiter, forgotPasswordValidation, validate, forgotPassword);
router.post("/verify-otp", authLimiter, verifyEmailValidation, validate, verifyOTP);
router.post("/reset-password", authLimiter, resetPasswordValidation, validate, resetPassword);
router.post("/refresh-token", authLimiter, refreshAccessToken);

export default router;
