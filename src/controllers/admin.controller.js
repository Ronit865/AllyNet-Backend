import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import User from '../models/user.model.js';
import { parseCsv } from '../utils/csvParser.js';
import { changePassword } from '../services/password.service.js';
import { updateAvatar } from '../services/media.service.js';

const updateAdminProfile = asyncHandler(async (req, res) => {
  const { name, email } = req.body;

  if (!name || !email) {
    throw new ApiError(400, 'Name and Email are required');
  }

  if (email) {
    const existingUser = await User.findOne({
      email,
      _id: { $ne: req.user._id }
    });

    if (existingUser) {
      throw new ApiError(400, 'Email already exists');
    }
  }

  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { name, email } },
    { new: true }
  ).select('-password -refreshToken');

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  return res.status(200).json(new ApiResponse(200, user, 'Profile updated successfully'));
});

const changeAdminPassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id);
  await changePassword(user, oldPassword, newPassword);
  return res.status(200).json(new ApiResponse(200, {}, 'Password changed successfully'));
});

const updateAdminAvatar = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  await updateAvatar(user, req.file?.path);

  const updatedUser = await User.findById(req.user._id).select('-password -refreshToken');
  return res.status(200).json(new ApiResponse(200, updatedUser, 'Avatar updated successfully'));
});

const getCurrentAdmin = asyncHandler(async (req, res) => {
  return res.status(200).json(new ApiResponse(200, req.user, 'Admin fetched successfully'));
});

const addStudentCsv = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'CSV file is required');
  }

  const users = await parseCsv(req.file.path);
  await User.insertMany(users);

  return res.status(201).json(new ApiResponse(201, {}, 'Users added successfully'));
});

const editUserDetails = asyncHandler(async (req, res) => {
  const { _id } = req.params;
  if (!_id) {
    throw new ApiError(400, 'User ID is required');
  }

  const { name, email, role, graduationYear, course, phone } = req.body;

  const user = await User.findByIdAndUpdate(
    _id,
    {
      $set: {
        name,
        email,
        role,
        graduationYear,
        course,
        phone
      }
    },
    { new: true }
  );

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  return res.status(200).json(new ApiResponse(200, user, 'User details updated successfully'));
});

export { changeAdminPassword, updateAdminAvatar, addStudentCsv, editUserDetails, getCurrentAdmin, updateAdminProfile };
