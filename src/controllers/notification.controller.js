import { Notification } from "../models/notification.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

// Get all notifications for logged-in user
export const getNotifications = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, unreadOnly = false, type } = req.query;
  
  const currentUser = req.user || req.admin;
  const query = { recipient: currentUser._id };
  if (unreadOnly === 'true') {
    query.read = false;
  }
  
  // Filter by type if provided (can be comma-separated for multiple types)
  if (type) {
    const types = type.split(',').map(t => t.trim());
    query.type = { $in: types };
  }

  const notifications = await Notification.find(query)
    .populate('sender', 'name avatar currentPosition company')
    .populate('postId', 'content')
    .sort({ createdAt: -1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit));

  const total = await Notification.countDocuments(query);
  const unreadCount = await Notification.countDocuments({ 
    recipient: currentUser._id, 
    read: false 
  });

  res.status(200).json(
    new ApiResponse(200, {
      notifications,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      unreadCount
    }, "Notifications fetched successfully")
  );
});

// Mark notification as read
export const markAsRead = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;

  const currentUser = req.user || req.admin;
  const notification = await Notification.findOne({
    _id: notificationId,
    recipient: currentUser._id
  });

  if (!notification) {
    throw new ApiError(404, "Notification not found");
  }

  notification.read = true;
  await notification.save();

  res.status(200).json(
    new ApiResponse(200, notification, "Notification marked as read")
  );
});

// Mark all notifications as read
export const markAllAsRead = asyncHandler(async (req, res) => {
  const currentUser = req.user || req.admin;
  await Notification.updateMany(
    { recipient: currentUser._id, read: false },
    { read: true }
  );

  res.status(200).json(
    new ApiResponse(200, {}, "All notifications marked as read")
  );
});

// Delete notification
export const deleteNotification = asyncHandler(async (req, res) => {
  const { notificationId } = req.params;

  const currentUser = req.user || req.admin;
  const notification = await Notification.findOneAndDelete({
    _id: notificationId,
    recipient: currentUser._id
  });

  if (!notification) {
    throw new ApiError(404, "Notification not found");
  }

  res.status(200).json(
    new ApiResponse(200, {}, "Notification deleted successfully")
  );
});

// Get unread notification count
export const getUnreadCount = asyncHandler(async (req, res) => {
  const currentUser = req.user || req.admin;
  const unreadCount = await Notification.countDocuments({
    recipient: currentUser._id,
    read: false
  });

  res.status(200).json(
    new ApiResponse(200, { unreadCount }, "Unread count fetched successfully")
  );
});

// Helper function to create notification (used by other controllers)
export const createNotification = async ({
  recipient,
  sender,
  type,
  title,
  message,
  postId,
  commentId
}) => {
  try {
    // Don't create notification if sender is the same as recipient
    if (recipient.toString() === sender.toString()) {
      return null;
    }

    const notification = await Notification.create({
      recipient,
      sender,
      type,
      title,
      message,
      postId,
      commentId
    });

    // Emit Socket.io event for real-time notification delivery
    const { emitNewNotification } = await import('../services/socket.service.js');
    emitNewNotification(recipient.toString(), notification);

    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    return null;
  }
};
