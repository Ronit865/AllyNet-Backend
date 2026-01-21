import express from 'express';
import { upload } from '../middlewares/multer.middleware.js';
import { verifyAdminJWT } from '../middlewares/auth.middleware.js';
import { deleteUser, getAllUser } from '../controllers/user.controller.js';
import { getReports, getReportedUsers, banUser, unbanUser, dismissReport } from '../controllers/report.controller.js';

import { addStudentCsv, changeAdminPassword, editUserDetails, getCurrentAdmin, updateAdminAvatar, updateAdminProfile, } from '../controllers/admin.controller.js';

const router = express.Router();

// router.route("/Adminlogin").post(loginAdmin)

// router.route("/Adminlogout").post(verifyAdminJWT, logoutAdmin)

router.route("/addcsv").post(verifyAdminJWT, upload.single("csv"), addStudentCsv)

router.route("/editdetails/:_id").patch(verifyAdminJWT, editUserDetails)

router.route("/alluser").get(verifyAdminJWT, getAllUser)

router.route("/deleteuser/:userId").delete(verifyAdminJWT, deleteUser)

router.route("/change-password").post(verifyAdminJWT, changeAdminPassword)

router.route("/update-avatar").patch(verifyAdminJWT, upload.single("avatar"), updateAdminAvatar)

router.route("/current-admin").get(verifyAdminJWT, getCurrentAdmin);

router.route("/current").get(verifyAdminJWT, getCurrentAdmin);

router.route("/update-profile").patch(verifyAdminJWT, updateAdminProfile);

// Reports management routes
router.route("/reports").get(verifyAdminJWT, getReports);
router.route("/reported-users").get(verifyAdminJWT, getReportedUsers);
router.route("/users/:userId/ban").post(verifyAdminJWT, banUser);
router.route("/users/:userId/unban").post(verifyAdminJWT, unbanUser);
router.route("/reports/:reportId/dismiss").patch(verifyAdminJWT, dismissReport);

export default router;