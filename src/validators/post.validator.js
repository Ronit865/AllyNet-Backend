import { body, param, query } from 'express-validator';
import { isValidObjectId } from '../middlewares/validation.middleware.js';

/**
 * Validation rules for creating a post
 */
export const createPostValidation = [
  body('content')
    .notEmpty()
    .withMessage('Post content is required')
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Post content must be between 1 and 5000 characters'),
  
  body('category')
    .notEmpty()
    .withMessage('Category is required')
    .isIn(['Mentorship', 'Events', 'Research', 'Jobs', 'Alumni Stories', 'General'])
    .withMessage('Invalid category'),
  
  body('images')
    .optional()
    .isArray()
    .withMessage('Images must be an array')
    .custom((images) => {
      if (images.length > 10) {
        throw new Error('Maximum 10 images allowed');
      }
      return true;
    }),
  
  body('images.*')
    .optional()
    .isURL()
    .withMessage('Each image must be a valid URL')
];

/**
 * Validation rules for updating a post
 */
export const updatePostValidation = [
  param('postId')
    .notEmpty()
    .withMessage('Post ID is required')
    .custom(isValidObjectId)
    .withMessage('Invalid post ID format'),
  
  body('content')
    .optional()
    .trim()
    .isLength({ min: 1, max: 5000 })
    .withMessage('Post content must be between 1 and 5000 characters'),
  
  body('category')
    .optional()
    .isIn(['Mentorship', 'Events', 'Research', 'Jobs', 'Alumni Stories', 'General'])
    .withMessage('Invalid category'),
  
  body('images')
    .optional()
    .isArray()
    .withMessage('Images must be an array')
    .custom((images) => {
      if (images.length > 10) {
        throw new Error('Maximum 10 images allowed');
      }
      return true;
    })
];

/**
 * Validation rules for getting a post by ID
 */
export const getPostByIdValidation = [
  param('postId')
    .notEmpty()
    .withMessage('Post ID is required')
    .custom(isValidObjectId)
    .withMessage('Invalid post ID format')
];

/**
 * Validation rules for deleting a post
 */
export const deletePostValidation = [
  param('postId')
    .notEmpty()
    .withMessage('Post ID is required')
    .custom(isValidObjectId)
    .withMessage('Invalid post ID format')
];

/**
 * Validation rules for upvoting/downvoting a post
 */
export const votePostValidation = [
  param('postId')
    .notEmpty()
    .withMessage('Post ID is required')
    .custom(isValidObjectId)
    .withMessage('Invalid post ID format')
];

/**
 * Validation rules for pinning a post
 */
export const pinPostValidation = [
  param('postId')
    .notEmpty()
    .withMessage('Post ID is required')
    .custom(isValidObjectId)
    .withMessage('Invalid post ID format'),
  
  body('isPinned')
    .notEmpty()
    .withMessage('isPinned is required')
    .isBoolean()
    .withMessage('isPinned must be a boolean')
];

/**
 * Validation rules for getting posts with filters
 */
export const getPostsValidation = [
  query('category')
    .optional()
    .isIn(['Mentorship', 'Events', 'Research', 'Jobs', 'Alumni Stories', 'General'])
    .withMessage('Invalid category'),
  
  query('author')
    .optional()
    .custom(isValidObjectId)
    .withMessage('Invalid author ID format'),
  
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'netVotes', 'upvotes', 'hot'])
    .withMessage('Invalid sortBy field'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
];

/**
 * Validation rules for searching posts
 */
export const searchPostsValidation = [
  query('q')
    .notEmpty()
    .withMessage('Search query is required')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Search query must be between 2 and 100 characters'),
  
  query('category')
    .optional()
    .isIn(['Mentorship', 'Events', 'Research', 'Jobs', 'Alumni Stories', 'General'])
    .withMessage('Invalid category'),
  
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

/**
 * Validation rules for adding a comment
 */
export const addCommentValidation = [
  param('postId')
    .notEmpty()
    .withMessage('Post ID is required')
    .custom(isValidObjectId)
    .withMessage('Invalid post ID format'),
  
  body('content')
    .notEmpty()
    .withMessage('Comment content is required')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Comment must be between 1 and 1000 characters'),
  
  body('parentComment')
    .optional()
    .custom(isValidObjectId)
    .withMessage('Invalid parent comment ID format')
];

/**
 * Validation rules for saving/bookmarking a post
 */
export const savePostValidation = [
  param('postId')
    .notEmpty()
    .withMessage('Post ID is required')
    .custom(isValidObjectId)
    .withMessage('Invalid post ID format')
];

export default {
  createPostValidation,
  updatePostValidation,
  getPostByIdValidation,
  deletePostValidation,
  votePostValidation,
  pinPostValidation,
  getPostsValidation,
  searchPostsValidation,
  addCommentValidation,
  savePostValidation
};
