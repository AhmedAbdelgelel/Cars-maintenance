const express = require("express");
const router = express.Router();
const {
  getMyNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  getNotificationStats,
} = require("../services/notificationService");
const { protect } = require("../middlewares/authMiddleware");

// User endpoints (driver, receiver, admin)
router.get("/my", protect, getMyNotifications);
router.get("/stats", protect, getNotificationStats);
router.patch("/mark-all-read", protect, markAllNotificationsAsRead);
router.patch("/:notificationId/read", protect, markNotificationAsRead);
router.delete("/:notificationId", protect, deleteNotification);

module.exports = router;
