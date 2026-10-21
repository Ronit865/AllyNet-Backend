import asyncHandler from '../utils/asyncHandler.js';
import User from '../models/user.model.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { changePassword } from '../services/password.service.js';
import { updateAvatar } from '../services/media.service.js';

const changeUserPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id);
  await changePassword(user, oldPassword, newPassword);
  return res.status(200).json(new ApiResponse(200, {}, 'Password changed successfully'));
});

const getAllUser = asyncHandler(async (req, res) => {
  const users = await User.find().select('-password -refreshToken');
  return res.status(200).json(new ApiResponse(200, users, 'All users fetched successfully'));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password -refreshToken');
  return res.status(200).json(new ApiResponse(200, user, 'Current user fetched successfully'));
});

const getUserById = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const user = await User.findById(userId).select('-password -refreshToken');
  
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  
  return res.status(200).json(new ApiResponse(200, user, 'User fetched successfully'));
});

const updateUserDetails = asyncHandler(async (req, res) => {
  const { name, email, currentPosition, company, location, phone, bio, linkedin, github } = req.body;
  
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { name, email, currentPosition, company, location, phone, bio, linkedin, github } },
    { new: true }
  ).select('-password -refreshToken');
  
  return res.status(200).json(new ApiResponse(200, user, 'User details updated successfully'));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  await updateAvatar(user, req.file?.path);
  
  const updatedUser = await User.findById(req.user._id).select('-password -refreshToken');
  return res.status(200).json(new ApiResponse(200, updatedUser, 'Avatar updated successfully'));
});

const deleteUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  
  if (!userId) {
    throw new ApiError(400, 'User ID is required');
  }
  
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  
  if (user.avatar && !user.avatar.includes('dicebear.com')) {
    const { deleteFromCloudinary, extractPublicId } = await import('../utils/cloudinary.js');
    const avatarPublicId = extractPublicId(user.avatar);
    if (avatarPublicId) {
      await deleteFromCloudinary(avatarPublicId);
    }
  }
  
  await User.findByIdAndDelete(userId);
  return res.status(200).json(new ApiResponse(200, {}, 'User deleted successfully'));
});

export {
  changeUserPassword,
  getCurrentUser,
  getUserById,
  updateUserDetails,
  updateUserAvatar,
  getAllUser,
  deleteUser
};
