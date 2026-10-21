import express from 'express';
import { changeUserPassword, getAllUser, getCurrentUser, getUserById, updateUserAvatar, updateUserDetails } from '../controllers/user.controller.js';
import { upload } from '../middlewares/multer.middleware.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { requireNotBanned } from '../middlewares/banCheck.middleware.js';
import { uploadLimiter, generalLimiter } from '../middlewares/rateLimiter.middleware.js';
import { validate, validatePagination, validateSearch } from '../middlewares/validation.middleware.js';
import { updateProfileValidation, getUserByIdValidation } from '../validators/user.validator.js';
import { changePasswordValidation } from '../validators/auth.validator.js';

const router = express.Router();

router.get("/alluser", generalLimiter, validatePagination, validateSearch, getAllUser);

router.use(authenticate);

router.get("/user", getCurrentUser);
router.get("/:userId", getUserByIdValidation, validate, getUserById);
router.post("/change-password", requireNotBanned, changePasswordValidation, validate, changeUserPassword);
router.patch("/update-user", requireNotBanned, updateProfileValidation, validate, updateUserDetails);
router.post("/update-avatar", requireNotBanned, uploadLimiter, upload.single("avatar"), updateUserAvatar);

export default router;
