const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['alert', 'bill', 'warning', 'info', 'device'],
    default: 'info',
  },
  severity: {
    type: String,
    enum: ['info', 'warning', 'critical'],
    default: 'info',
  },
  targetRole: {
    type: String,
    enum: ['all', 'admin', 'management', 'student'],
    default: 'all',
  },
  targetUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    default: null,
  },
  device: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    default: null,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  readAt: {
    type: Date,
    default: null,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  }
}, {
  timestamps: true,
});

notificationSchema.index({ targetRole: 1, createdAt: -1 });
notificationSchema.index({ targetUser: 1, isRead: 1 });
notificationSchema.index({ room: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
