import express from 'express';
import {
  createPost, getAllPosts, getPostById, updatePost, deletePost,
  upvotePost, downvotePost, toggleSavePost, togglePinPost, reportPost,
  getSavedPosts, getUserPosts, getCommunicationStats
} from '../controllers/post.controller.js';
import {
  createComment, getPostComments, getCommentReplies, updateComment, deleteComment,
  upvoteComment, downvoteComment
} from '../controllers/comment.controller.js';
import { authenticate, optionalAuth } from '../middlewares/auth.middleware.js';
import { requirePermission, requireOwnershipOrPermission } from '../middlewares/rbac.middleware.js';
import { requireNotBanned, canCreateContent } from '../middlewares/banCheck.middleware.js';
import { postCreationLimiter, commentCreationLimiter, generalLimiter } from '../middlewares/rateLimiter.middleware.js';
import { validate, validatePagination } from '../middlewares/validation.middleware.js';
import { PERMISSIONS } from '../config/permissions.config.js';
import { upload } from '../middlewares/multer.middleware.js';
import {
  createPostValidation, updatePostValidation, getPostByIdValidation,
  deletePostValidation, votePostValidation, pinPostValidation,
  getPostsValidation, addCommentValidation, savePostValidation
} from '../validators/post.validator.js';

const router = express.Router();

router.get('/posts', optionalAuth, generalLimiter, getPostsValidation, validate, validatePagination, getAllPosts);
router.post('/posts', authenticate, requireNotBanned, canCreateContent, postCreationLimiter, upload.array('images', 5), createPostValidation, validate, createPost);
router.get('/posts/stats', authenticate, getCommunicationStats);
router.get('/posts/saved', authenticate, validatePagination, getSavedPosts);
router.get('/posts/user/:userId', optionalAuth, validatePagination, getUserPosts);
router.get('/posts/:postId', optionalAuth, getPostByIdValidation, validate, getPostById);
router.patch('/posts/:postId', authenticate, requireNotBanned, requireOwnershipOrPermission('post', 'postId', async (postId) => {
  const { Post } = await import('../models/post.model.js');
  const post = await Post.findById(postId);
  return post?.author;
}, PERMISSIONS.POST_UPDATE), updatePostValidation, validate, updatePost);
router.delete('/posts/:postId', authenticate, requireOwnershipOrPermission('post', 'postId', async (postId) => {
  const { Post } = await import('../models/post.model.js');
  const post = await Post.findById(postId);
  return post?.author;
}, PERMISSIONS.POST_DELETE), deletePostValidation, validate, deletePost);
router.post('/posts/:postId/upvote', authenticate, requireNotBanned, votePostValidation, validate, upvotePost);
router.post('/posts/:postId/downvote', authenticate, requireNotBanned, votePostValidation, validate, downvotePost);
router.post('/posts/:postId/save', authenticate, savePostValidation, validate, toggleSavePost);
router.post('/posts/:postId/pin', authenticate, requirePermission(PERMISSIONS.POST_PIN), pinPostValidation, validate, togglePinPost);
router.post('/posts/:postId/report', authenticate, requireNotBanned, requirePermission(PERMISSIONS.REPORT_CREATE), reportPost);

router.post('/comments', authenticate, requireNotBanned, canCreateContent, commentCreationLimiter, addCommentValidation, validate, createComment);
router.get('/posts/:postId/comments', optionalAuth, validatePagination, getPostComments);
router.patch('/comments/:commentId', authenticate, requireNotBanned, requireOwnershipOrPermission('comment', 'commentId', async (commentId) => {
  const { Comment } = await import('../models/comment.model.js');
  const comment = await Comment.findById(commentId);
  return comment?.author;
}, PERMISSIONS.COMMENT_UPDATE_OWN), updateComment);
router.delete('/comments/:commentId', authenticate, requireOwnershipOrPermission('comment', 'commentId', async (commentId) => {
  const { Comment } = await import('../models/comment.model.js');
  const comment = await Comment.findById(commentId);
  return comment?.author;
}, PERMISSIONS.COMMENT_DELETE), deleteComment);
router.post('/comments/:commentId/upvote', authenticate, requireNotBanned, upvoteComment);
router.post('/comments/:commentId/downvote', authenticate, requireNotBanned, downvoteComment);
router.get('/comments/:commentId/replies', optionalAuth, generalLimiter, validatePagination, getCommentReplies);

export default router;
