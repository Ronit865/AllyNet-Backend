import ApiError from '../utils/ApiError.js';

export const changePassword = async (user, oldPassword, newPassword) => {
  if (!oldPassword || !newPassword) {
    throw new ApiError(400, 'All fields are required');
  }

  if (oldPassword === newPassword) {
    throw new ApiError(400, 'New password must be different from old password');
  }

  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
  if (!isPasswordCorrect) {
    throw new ApiError(400, 'Invalid old password');
  }

  user.password = newPassword;
  await user.save({ validateBeforeSave: false });
};
