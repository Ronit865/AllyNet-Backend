import asyncHandler from '../utils/asyncHandler.js';
import Comment from '../models/comment.model.js';
import Post from '../models/post.model.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { createNotification } from './notification.controller.js';
import { containsInappropriateContent } from '../utils/contentFilter.js';

// Create a new comment
const createComment = asyncHandler(async (req, res) => {
  const { content, postId, parentCommentId } = req.body;

  // Check if user is banned
  if (req.user.banStatus === 'suspended' || req.user.banStatus === 'temp_banned') {
    throw new ApiError(403, `You are banned from commenting. Reason: ${req.user.banReason || 'Community guidelines violation'}`);
  }

  if (!content || !content.trim()) {
    throw new ApiError(400, "Comment content is required");
  }

  // Check for inappropriate content
  if (containsInappropriateContent(content)) {
    throw new ApiError(400, "Your comment contains inappropriate content. Please remove offensive language and try again.");
  }

  if (!postId) {
    throw new ApiError(400, "Post ID is required");
  }

  // Verify post exists
  const post = await Post.findById(postId);
  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  // If this is a reply, verify parent comment exists
  if (parentCommentId) {
    const parentComment = await Comment.findById(parentCommentId);
    if (!parentComment) {
      throw new ApiError(404, "Parent comment not found");
    }
  }

  const comment = await Comment.create({
    content,
    post: postId,
    author: req.user._id,
    parentComment: parentCommentId || null
  });

  // Process mentions
  const { processMentions } = await import('../utils/mentions.js');
  await processMentions(content, req.user._id, postId, comment._id, 'comment');

  // Increment comment count on post
  post.commentsCount += 1;
  await post.save();

  const populatedComment = await Comment.findById(comment._id)
    .populate('author', 'name avatar email graduationYear currentPosition company');

  // Create notification for post/comment author
  if (parentCommentId) {
    // Reply to comment - notify comment author
    const parentComment = await Comment.findById(parentCommentId).populate('author', 'name');
    await createNotification({
      recipient: parentComment.author._id,
      sender: req.user._id,
      type: 'reply',
      title: `${req.user.name} replied to your comment`,
      message: content.substring(0, 100),
      postId: postId,
      commentId: comment._id
    });
  } else {
    // Comment on post - notify post author
    await createNotification({
      recipient: post.author,
      sender: req.user._id,
      type: 'comment',
      title: `${req.user.name} commented on your post`,
      message: content.substring(0, 100),
      postId: postId,
      commentId: comment._id
    });
  }

  return res
    .status(201)
    .json(new ApiResponse(201, populatedComment, "Comment created successfully"));
});

// Get comments for a post
const getPostComments = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { page = 1, limit = 20, sortBy = 'createdAt', order = 'desc' } = req.query;

  const skip = (page - 1) * limit;

  // Verify post exists
  const post = await Post.findById(postId);
  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  // Build sort option
  let sortOption = {};
  if (sortBy === 'top') {
    sortOption = { upvotes: -1 };
  } else if (sortBy === 'new') {
    sortOption = { createdAt: -1 };
  } else {
    sortOption[sortBy] = order === 'desc' ? -1 : 1;
  }

  // Get top-level comments (no parent)
  const comments = await Comment.find({
    post: postId,
    parentComment: null,
    isActive: true
  })
    .populate('author', 'name avatar email graduationYear currentPosition company')
    .sort(sortOption)
    .skip(skip)
    .limit(parseInt(limit));

  const totalComments = await Comment.countDocuments({
    post: postId,
    parentComment: null,
    isActive: true
  });

  return res
    .status(200)
    .json(new ApiResponse(200, {
      comments,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalComments / limit),
        totalComments,
        hasMore: skip + comments.length < totalComments
      }
    }, "Comments fetched successfully"));
});

// Get replies to a comment
const getCommentReplies = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const skip = (page - 1) * limit;

  // Verify parent comment exists
  const parentComment = await Comment.findById(commentId);
  if (!parentComment) {
    throw new ApiError(404, "Comment not found");
  }

  const replies = await Comment.find({
    parentComment: commentId,
    isActive: true
  })
    .populate('author', 'name avatar email graduationYear currentPosition company')
    .sort({ createdAt: 1 })
    .skip(skip)
    .limit(parseInt(limit));

  const totalReplies = await Comment.countDocuments({
    parentComment: commentId,
    isActive: true
  });

  return res
    .status(200)
    .json(new ApiResponse(200, {
      replies,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalReplies / limit),
        totalReplies,
        hasMore: skip + replies.length < totalReplies
      }
    }, "Replies fetched successfully"));
});

// Update comment
const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;

  if (!content || !content.trim()) {
    throw new ApiError(400, "Comment content is required");
  }

  const comment = await Comment.findById(commentId);

  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  // Check if user is the author
  if (comment.author.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not authorized to update this comment");
  }

  comment.content = content;
  await comment.save();

  const updatedComment = await Comment.findById(commentId)
    .populate('author', 'name avatar email graduationYear currentPosition company');

  return res
    .status(200)
    .json(new ApiResponse(200, updatedComment, "Comment updated successfully"));
});

// Delete comment (soft delete)
const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  const comment = await Comment.findById(commentId);

  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  // Check if user is the author or admin
  if (comment.author.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    throw new ApiError(403, "You are not authorized to delete this comment");
  }

  // Check if comment is within 24 hours (admins can delete anytime)
  if (req.user.role !== 'admin') {
    const commentAge = Date.now() - new Date(comment.createdAt).getTime();
    const twentyFourHours = 24 * 60 * 60 * 1000;

    if (commentAge > twentyFourHours) {
      throw new ApiError(403, "Comments can only be deleted within 24 hours of posting");
    }
  }

  comment.isActive = false;
  await comment.save();

  // Decrement comment count on post
  const post = await Post.findById(comment.post);
  if (post) {
    post.commentsCount = Math.max(0, post.commentsCount - 1);
    await post.save();
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Comment deleted successfully"));
});

// Upvote a comment
const upvoteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user._id;

  const comment = await Comment.findById(commentId);

  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  const hasUpvoted = comment.upvotedBy.includes(userId);
  const hasDownvoted = comment.downvotedBy.includes(userId);

  if (hasUpvoted) {
    // Remove upvote
    comment.upvotedBy = comment.upvotedBy.filter(id => id.toString() !== userId.toString());
    comment.upvotes = Math.max(0, comment.upvotes - 1);
  } else {
    // Add upvote
    comment.upvotedBy.push(userId);
    comment.upvotes += 1;

    // Remove downvote if exists
    if (hasDownvoted) {
      comment.downvotedBy = comment.downvotedBy.filter(id => id.toString() !== userId.toString());
      comment.downvotes = Math.max(0, comment.downvotes - 1);
    }
  }

  await comment.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {
      upvotes: comment.upvotes,
      downvotes: comment.downvotes,
      hasUpvoted: !hasUpvoted,
      hasDownvoted: false
    }, hasUpvoted ? "Upvote removed" : "Comment upvoted"));
});

// Downvote a comment
const downvoteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user._id;

  const comment = await Comment.findById(commentId);

  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  const hasUpvoted = comment.upvotedBy.includes(userId);
  const hasDownvoted = comment.downvotedBy.includes(userId);

  if (hasDownvoted) {
    // Remove downvote
    comment.downvotedBy = comment.downvotedBy.filter(id => id.toString() !== userId.toString());
    comment.downvotes = Math.max(0, comment.downvotes - 1);
  } else {
    // Add downvote
    comment.downvotedBy.push(userId);
    comment.downvotes += 1;

    // Remove upvote if exists
    if (hasUpvoted) {
      comment.upvotedBy = comment.upvotedBy.filter(id => id.toString() !== userId.toString());
      comment.upvotes = Math.max(0, comment.upvotes - 1);
    }
  }

  await comment.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {
      upvotes: comment.upvotes,
      downvotes: comment.downvotes,
      hasUpvoted: false,
      hasDownvoted: !hasDownvoted
    }, hasDownvoted ? "Downvote removed" : "Comment downvoted"));
});

export {
  createComment,
  getPostComments,
  getCommentReplies,
  updateComment,
  deleteComment,
  upvoteComment,
  downvoteComment
};
