const Notification = require("../models/Notification");

/**
 * GET /notifications
 * Returns all notifications for the current user, newest first.
 * Optional query: ?unread=true to get only unread ones.
 */
const getNotifications = async (req, res) => {
  try {
    const filter = { recipient: req.user._id };
    if (req.query.unread === "true") filter.read = false;

    const notifications = await Notification.find(filter)
      .populate("room", "title image")
      .populate("fromUser", "name")
      .populate({
        path: "application",
        populate: { path: "applicant", select: "name email" },
      })
      .sort({ createdAt: -1 })
      .limit(50);

    return res.status(200).json(notifications);
  } catch (error) {
    console.error("getNotifications error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * GET /notifications/unread-count
 * Returns the count of unread notifications for the current user.
 * Used by the frontend to show the notification badge.
 */
const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipient: req.user._id,
      read: false,
    });
    return res.status(200).json({ count });
  } catch (error) {
    console.error("getUnreadCount error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * PATCH /notifications/:id/read
 * Marks a single notification as read.
 */
const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { read: true },
      { new: true }
    );

    if (!notification) return res.status(404).json({ message: "Notification not found" });

    return res.status(200).json(notification);
  } catch (error) {
    console.error("markAsRead error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * PATCH /notifications/read-all
 * Marks all of the current user's notifications as read.
 */
const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { read: true }
    );
    return res.status(200).json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error("markAllAsRead error:", error);
    return res.status(500).json({ message: "Server error", error: error.message });
  }
};

module.exports = { getNotifications, getUnreadCount, markAsRead, markAllAsRead };
