const Notification = require("../models/notificationModel");
const ApiError = require("../utils/apiError");
const asyncHandler = require("express-async-handler");

// Get user's notifications
exports.getMyNotifications = asyncHandler(async (req, res, next) => {
  const userId = req.driver?._id || req.admin?._id || req.receiver?._id;

  if (!userId) {
    return next(new ApiError("Authentication required", 401));
  }

  const notifications = await Notification.find({ recipient: userId })
    .populate("sender", "name role")
    .populate("relatedRequest", "status description")
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: "success",
    results: notifications.length,
    data: notifications,
  });
});

// Mark notification as read
exports.markNotificationAsRead = asyncHandler(async (req, res, next) => {
  const userId = req.driver?._id || req.admin?._id || req.receiver?._id;
  const { notificationId } = req.params;

  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, recipient: userId },
    { isRead: true },
    { new: true }
  );

  if (!notification) {
    return next(new ApiError("Notification not found", 404));
  }

  res.status(200).json({
    status: "success",
    data: notification,
  });
});

// Mark all notifications as read
exports.markAllNotificationsAsRead = asyncHandler(async (req, res, next) => {
  const userId = req.driver?._id || req.admin?._id || req.receiver?._id;

  await Notification.updateMany(
    { recipient: userId, isRead: false },
    { isRead: true }
  );

  res.status(200).json({
    status: "success",
    message: "All notifications marked as read",
  });
});

// Delete notification
exports.deleteNotification = asyncHandler(async (req, res, next) => {
  const userId = req.driver?._id || req.admin?._id || req.receiver?._id;
  const { notificationId } = req.params;

  const notification = await Notification.findOneAndDelete({
    _id: notificationId,
    recipient: userId,
  });

  if (!notification) {
    return next(new ApiError("Notification not found", 404));
  }

  res.status(200).json({
    status: "success",
    message: "Notification deleted successfully",
  });
});

// Get notification stats
exports.getNotificationStats = asyncHandler(async (req, res, next) => {
  const userId = req.driver?._id || req.admin?._id || req.receiver?._id;

  const stats = await Notification.aggregate([
    { $match: { recipient: userId } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        unread: { $sum: { $cond: [{ $eq: ["$isRead", false] }, 1, 0] } },
      },
    },
  ]);

  const result = stats[0] || { total: 0, unread: 0 };
  const response = {
    totalNotifications: result.total,
    unreadNotifications: result.unread,
    readNotifications: result.total - result.unread,
  };

  res.status(200).json({
    status: "success",
    data: response,
  });
});
