const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} = require('../controllers/notificationController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getNotifications);

router.put('/read-all', protect, markAllAsRead);

router.route('/:id')
  .delete(protect, authorize('admin'), deleteNotification);

router.put('/:id/read', protect, markAsRead);

module.exports = router;
