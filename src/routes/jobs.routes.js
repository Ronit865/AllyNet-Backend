import express from 'express';
import { addJob, editJob, deleteJob, getAllJobs, verifyJob, jobApply, jobUnapply, jobApplicants, getMyPostedJobs, jobRejectByAdmin } from '../controllers/jobs.controller.js';
import { authenticate, optionalAuth } from '../middlewares/auth.middleware.js';
import { requirePermission, requireOwnershipOrPermission } from '../middlewares/rbac.middleware.js';
import { requireNotBanned } from '../middlewares/banCheck.middleware.js';
import { generalLimiter } from '../middlewares/rateLimiter.middleware.js';
import { validatePagination } from '../middlewares/validation.middleware.js';
import { PERMISSIONS } from '../config/permissions.config.js';

const router = express.Router();

router.get('/getAllJobs', optionalAuth, generalLimiter, validatePagination, getAllJobs);
router.get('/jobApplicants/:id', optionalAuth, generalLimiter, jobApplicants);
router.post('/addJob', authenticate, requireNotBanned, requirePermission(PERMISSIONS.JOB_CREATE), generalLimiter, addJob);
router.patch('/editJob/:id', authenticate, requireNotBanned, requireOwnershipOrPermission('job', 'id', async (jobId) => {
  const { Job } = await import('../models/jobs.model.js');
  const job = await Job.findById(jobId);
  return job?.postedBy || job?.createdBy;
}, PERMISSIONS.JOB_UPDATE), generalLimiter, editJob);
router.delete('/deleteJob/:id', authenticate, requireOwnershipOrPermission('job', 'id', async (jobId) => {
  const { Job } = await import('../models/jobs.model.js');
  const job = await Job.findById(jobId);
  return job?.postedBy || job?.createdBy;
}, PERMISSIONS.JOB_DELETE_OWN), generalLimiter, deleteJob);
router.delete('/rejectJob/:id', authenticate, requirePermission(PERMISSIONS.JOB_DELETE), generalLimiter, jobRejectByAdmin);
router.get('/getMyPostedJobs', authenticate, generalLimiter, validatePagination, getMyPostedJobs);
router.patch('/verifyJob/:id', authenticate, requirePermission(PERMISSIONS.JOB_UPDATE), generalLimiter, verifyJob);
router.post('/jobApply/:id', authenticate, requireNotBanned, generalLimiter, jobApply);
router.delete('/jobUnapply/:id', authenticate, generalLimiter, jobUnapply);

export default router;
