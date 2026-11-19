const Notification = require('../models/Notification');

// @desc    Get notifications
// @route   GET /api/notifications
// @access  Private
const getNotifications = async (req, res) => {
  try {
    const { type, severity, unreadOnly } = req.query;
    const role = req.user.role;
    let query = {};

    if (role === 'student') {
      query.$or = [
        { targetRole: { $in: ['all', 'student'] } },
        { targetUser: req.user._id }
      ];
    } else if (role === 'management') {
      query.$or = [
        { targetRole: { $in: ['all', 'management'] } },
        { targetUser: req.user._id }
      ];
    }
    // Admin sees all

    if (type) query.type = type;
    if (severity) query.severity = severity;
    if (unreadOnly === 'true') query.isRead = false;

    const notifications = await Notification.find(query)
      .populate('room', 'roomNumber block floor')
      .populate('device', 'deviceId name')
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({ ...query, isRead: false });

    res.json({
      success: true,
      unreadCount,
      count: notifications.length,
      data: notifications,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markAsRead = async (req, res) => {
  try {
    const notif = await Notification.findByIdAndUpdate(
      req.params.id,
      { isRead: true, readAt: new Date() },
      { new: true }
    );

    if (!notif) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.json({ success: true, data: notif });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/notifications/read-all
// @access  Private
const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany({ isRead: false }, { isRead: true, readAt: new Date() });
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Admin
const deleteNotification = async (req, res) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
