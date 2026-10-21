import asyncHandler from '../utils/asyncHandler.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import User from '../models/user.model.js';
import otpGenerator from 'otp-generator';
import { sendOtp } from '../services/otp.service.js';
import jwt from 'jsonwebtoken';
import { generateTokens } from '../services/auth.service.js';
import { BAN_STATUS, isAdmin } from '../constants/roles.js';
import mongoose from 'mongoose';

const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.COOKIE_SAME_SITE || 'lax',
  path: '/'
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken = req.cookies.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, 'Unauthorized request');
  }

  try {
    const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, 'Invalid refresh token');
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, 'Refresh token is expired');
    }

    const { accessToken, refreshToken: newRefreshToken } = await generateTokens(user);

    return res
      .status(200)
      .cookie('accessToken', accessToken, getCookieOptions())
      .cookie('refreshToken', newRefreshToken, getCookieOptions())
      .json(new ApiResponse(200, null, 'Access token refreshed'));
  } catch (error) {
    throw new ApiError(401, error?.message || 'Invalid refresh token');
  }
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required');
  }

  // Try to find user in users collection first
  let user = await User.findOne({ email });
  
  // If not found, check admins collection (legacy data migration)
  if (!user) {
    const adminsCollection = mongoose.connection.collection('admins');
    const adminDoc = await adminsCollection.findOne({ email });
    
    if (adminDoc) {
      // Migrate admin to users collection
      const migratedUser = new User({
        _id: adminDoc._id,
        name: adminDoc.name,
        email: adminDoc.email,
        password: adminDoc.password,
        role: adminDoc.role || 'admin',
        avatar: adminDoc.avatar,
        graduationYear: adminDoc.graduationYear,
        course: adminDoc.course,
        currentPosition: adminDoc.currentPosition,
        company: adminDoc.company,
        location: adminDoc.location,
        phone: adminDoc.phone,
        bio: adminDoc.bio,
        linkedin: adminDoc.linkedin,
        github: adminDoc.github,
        isVerified: adminDoc.isVerified,
        banStatus: adminDoc.banStatus || BAN_STATUS.ACTIVE,
        reportCount: adminDoc.reportCount || 0,
        createdAt: adminDoc.createdAt,
        updatedAt: adminDoc.updatedAt
      });
      
      await migratedUser.save({ validateBeforeSave: false });
      user = migratedUser;
    }
  }

  if (!user) {
    throw new ApiError(404, 'Invalid email or password');
  }

  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, 'Incorrect password. Please try again.');
  }

  // Check and auto-unban if expired
  if (user.banStatus === BAN_STATUS.TEMP_BANNED) {
    if (user.banExpiresAt && new Date() > new Date(user.banExpiresAt)) {
      user.banStatus = BAN_STATUS.ACTIVE;
      user.banReason = null;
      user.banExpiresAt = null;
      await user.save({ validateBeforeSave: false });
    }
  }

  const { accessToken, refreshToken } = await generateTokens(user);
  const loggedInUser = await User.findById(user._id).select('-password -refreshToken');
  const userType = isAdmin(loggedInUser.role) ? 'admin' : 'user';

  return res
    .status(200)
    .cookie('accessToken', accessToken, getCookieOptions())
    .cookie('refreshToken', refreshToken, getCookieOptions())
    .json(new ApiResponse(200, {
      user: loggedInUser,
      userType
    }, 'User logged in successfully'));
});

const logout = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { $unset: { refreshToken: 1 } }, { new: true });

  return res
    .status(200)
    .clearCookie('accessToken', getCookieOptions())
    .clearCookie('refreshToken', getCookieOptions())
    .json(new ApiResponse(200, {}, 'User logged out successfully'));
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, 'Email is required');
  }

  const user = await User.findOne({ email });

  if (!user) {
    throw new ApiError(404, 'User not found');
  }

  try {
    const otp = otpGenerator.generate(6, {
      upperCaseAlphabets: false,
      specialChars: false,
      lowerCaseAlphabets: false
    });

    user.resetPasswordOTP = otp;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    let emailResult = null;
    let lastError = null;
    const maxAttempts = 3;
    const timeoutDuration = 10000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const emailPromise = sendOtp(email, otp);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Email timeout after ${timeoutDuration / 1000}s (attempt ${attempt})`)), timeoutDuration)
        );

        emailResult = await Promise.race([emailPromise, timeoutPromise]);

        if (emailResult && emailResult.success) {
          break;
        }

        lastError = emailResult?.error || emailResult?.message || 'Unknown error';
      } catch (attemptError) {
        lastError = attemptError.message;
      }

      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    if (!emailResult || !emailResult.success) {
      if (process.env.NODE_ENV === 'development' || process.env.SHOW_OTP_ON_FAIL === 'true') {
        return res.status(200).json(
          new ApiResponse(
            200,
            {
              devMode: true,
              message: 'Email service temporarily unavailable. Check console for OTP.',
              otp: process.env.SHOW_OTP_IN_RESPONSE === 'true' ? otp : undefined
            },
            'OTP generated (email service issue)'
          )
        );
      }

      user.resetPasswordOTP = undefined;
      user.resetPasswordExpires = undefined;
      await user.save({ validateBeforeSave: false });

      const isTimeoutError = lastError && lastError.includes('timeout');
      const errorMessage = isTimeoutError
        ? 'Email service is currently slow. Please try again in a few minutes.'
        : `Email service error: ${lastError}`;

      throw new ApiError(503, errorMessage);
    }

    return res.status(200).json(new ApiResponse(200, {}, 'OTP sent to email successfully'));
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(500, `Failed to process password reset request: ${error.message}`);
  }
});

const verifyOTP = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    throw new ApiError(400, 'Email and OTP are required');
  }

  const user = await User.findOne({
    email,
    resetPasswordOTP: otp,
    resetPasswordExpires: { $gt: Date.now() }
  });

  if (!user) {
    throw new ApiError(400, 'Invalid or expired OTP');
  }

  return res.status(200).json(new ApiResponse(200, {}, 'OTP verified ✅'));
});

const resetPassword = asyncHandler(async (req, res) => {
  const { email, newPassword, confirmPassword, otp } = req.body;

  if (!email || !newPassword || !confirmPassword || !otp) {
    throw new ApiError(400, 'All fields are required');
  }

  if (newPassword !== confirmPassword) {
    throw new ApiError(400, 'Passwords do not match');
  }

  if (newPassword.length < 6) {
    throw new ApiError(400, 'Password must be at least 6 characters long');
  }

  const user = await User.findOne({
    email,
    resetPasswordOTP: otp,
    resetPasswordExpires: { $gt: Date.now() }
  });

  if (!user) {
    throw new ApiError(400, 'Invalid or expired token');
  }

  user.password = newPassword;
  user.resetPasswordOTP = undefined;
  user.resetPasswordExpires = undefined;
  await user.save({ validateBeforeSave: false });

  return res.status(200).json(new ApiResponse(200, {}, 'Password reset successfully'));
});

export { login, logout, forgotPassword, verifyOTP, resetPassword, refreshAccessToken };
