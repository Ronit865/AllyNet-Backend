import jwt from 'jsonwebtoken';
import ApiError from '../utils/ApiError.js';

export const generateTokens = async (user) => {
  try {
    const accessToken = jwt.sign(
      {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
    );

    const refreshToken = jwt.sign(
      { _id: user._id },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
    );

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (err) {
    throw new ApiError(500, 'Error generating tokens');
  }
};
