import express from 'express';
import { upload } from '../middlewares/multer.middleware.js';
import { authenticate } from '../middlewares/auth.middleware.js';
import { adminOnly, requirePermission, preventPrivilegeEscalation } from '../middlewares/rbac.middleware.js';
import { adminLimiter, uploadLimiter } from '../middlewares/rateLimiter.middleware.js';
import { validate, validatePagination } from '../middlewares/validation.middleware.js';
import { PERMISSIONS } from '../config/permissions.config.js';
import {
  changeAdminPasswordValidation,
  editUserDetailsValidation,
  banUserValidation,
  unbanUserValidation,
  getReportsValidation,
  dismissReportValidation,
  updateAdminProfileValidation
} from '../validators/admin.validator.js';
import { deleteUser, getAllUser } from '../controllers/user.controller.js';
import { getReports, getReportedUsers, banUser, unbanUser, dismissReport } from '../controllers/report.controller.js';
import { addStudentCsv, changeAdminPassword, editUserDetails, getCurrentAdmin, updateAdminAvatar, updateAdminProfile } from '../controllers/admin.controller.js';

const router = express.Router();

router.use(authenticate);
router.use(adminOnly);
router.use(adminLimiter);

router.post("/addcsv", requirePermission(PERMISSIONS.USER_CREATE), uploadLimiter, upload.single("csv"), addStudentCsv);
router.patch("/editdetails/:_id", requirePermission(PERMISSIONS.USER_UPDATE), preventPrivilegeEscalation('_id'), editUserDetailsValidation, validate, editUserDetails);
router.get("/alluser", requirePermission(PERMISSIONS.USER_READ), validatePagination, getAllUser);
router.delete("/deleteuser/:userId", requirePermission(PERMISSIONS.USER_DELETE), preventPrivilegeEscalation('userId'), deleteUser);
router.post("/change-password", changeAdminPasswordValidation, validate, changeAdminPassword);
router.patch("/update-avatar", uploadLimiter, upload.single("avatar"), updateAdminAvatar);
router.get("/current-admin", getCurrentAdmin);
router.get("/current", getCurrentAdmin);
router.patch("/update-profile", updateAdminProfileValidation, validate, updateAdminProfile);
router.get("/reports", requirePermission(PERMISSIONS.REPORT_READ), getReportsValidation, validate, getReports);
router.get("/reported-users", requirePermission(PERMISSIONS.REPORT_READ), validatePagination, getReportedUsers);
router.post("/users/:userId/ban", requirePermission(PERMISSIONS.USER_BAN), preventPrivilegeEscalation('userId'), banUserValidation, validate, banUser);
router.post("/users/:userId/unban", requirePermission(PERMISSIONS.USER_UNBAN), unbanUserValidation, validate, unbanUser);
router.patch("/reports/:reportId/dismiss", requirePermission(PERMISSIONS.REPORT_DISMISS), dismissReportValidation, validate, dismissReport);

export default router;
