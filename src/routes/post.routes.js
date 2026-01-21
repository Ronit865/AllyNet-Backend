import express from 'express';
import {
  createPost,
  getAllPosts,
  getPostById,
  updatePost,
  deletePost,
  upvotePost,
  downvotePost,
  toggleSavePost,
  getSavedPosts,
  getUserPosts,
  getCommunicationStats,
  togglePinPost,
  reportPost
} from '../controllers/post.controller.js';
import {
  createComment,
  getPostComments,
  getCommentReplies,
  updateComment,
  deleteComment,
  upvoteComment,
  downvoteComment
} from '../controllers/comment.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { upload } from '../middlewares/multer.middleware.js';

const router = express.Router();

// Post routes
router.route('/posts')
  .get(verifyJWT, getAllPosts)
  .post(verifyJWT, upload.array('images', 5), createPost);

router.route('/posts/stats')
  .get(verifyJWT, getCommunicationStats);

router.route('/posts/saved')
  .get(verifyJWT, getSavedPosts);

router.route('/posts/user/:userId')
  .get(verifyJWT, getUserPosts);

router.route('/posts/:postId')
  .get(verifyJWT, getPostById)
  .patch(verifyJWT, updatePost)
  .delete(verifyJWT, deletePost);

router.route('/posts/:postId/upvote')
  .post(verifyJWT, upvotePost);

router.route('/posts/:postId/downvote')
  .post(verifyJWT, downvotePost);

router.route('/posts/:postId/save')
  .post(verifyJWT, toggleSavePost);

router.route('/posts/:postId/pin')
  .post(verifyJWT, togglePinPost);

router.route('/posts/:postId/report')
  .post(verifyJWT, reportPost);

// Comment routes
router.route('/comments')
  .post(verifyJWT, createComment);

router.route('/posts/:postId/comments')
  .get(verifyJWT, getPostComments);

router.route('/comments/:commentId')
  .patch(verifyJWT, updateComment)
  .delete(verifyJWT, deleteComment);

router.route('/comments/:commentId/replies')
  .get(verifyJWT, getCommentReplies);

router.route('/comments/:commentId/upvote')
  .post(verifyJWT, upvoteComment);

router.route('/comments/:commentId/downvote')
  .post(verifyJWT, downvoteComment);

export default router;
