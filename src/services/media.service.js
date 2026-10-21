import ApiError from '../utils/ApiError.js';
import { uploadOnCloudinary, deleteFromCloudinary, extractPublicId } from '../utils/cloudinary.js';

export const updateAvatar = async (user, filePath) => {
  if (!filePath) {
    throw new ApiError(400, 'File is required');
  }

  const uploadResult = await uploadOnCloudinary(filePath);
  if (!uploadResult?.url) {
    throw new ApiError(400, 'Failed to upload file');
  }

  const oldAvatar = user.avatar;
  user.avatar = uploadResult.url;
  await user.save({ validateBeforeSave: false });

  // Delete old avatar if it exists and not default
  if (oldAvatar && !oldAvatar.includes('dicebear.com')) {
    const oldPublicId = extractPublicId(oldAvatar);
    if (oldPublicId) {
      await deleteFromCloudinary(oldPublicId);
    }
  }

  return uploadResult.url;
};
