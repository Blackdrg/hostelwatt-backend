const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: [true, 'Device ID is required'],
    unique: true,
    trim: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  macAddress: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    default: null,
  },
  ipAddress: {
    type: String,
    default: '192.168.1.100',
  },
  firmwareVersion: {
    type: String,
    default: 'v1.2.0',
  },
  status: {
    type: String,
    enum: ['online', 'offline', 'error', 'maintenance'],
    default: 'offline',
  },
  lastSeen: {
    type: Date,
    default: null,
  },
  samplingIntervalSec: {
    type: Number,
    default: 10,
  },
  // Real-time snapshot values
  lastVoltage: {
    type: Number,
    default: 230.0,
  },
  lastCurrent: {
    type: Number,
    default: 0.0,
  },
  lastPowerKw: {
    type: Number,
    default: 0.0,
  },
  lastPowerFactor: {
    type: Number,
    default: 0.95,
  },
  cumulativeKwh: {
    type: Number,
    default: 0.0,
  },
  isSimulated: {
    type: Boolean,
    default: false,
  }
}, {
  timestamps: true,
});

deviceSchema.index({ room: 1 });
deviceSchema.index({ status: 1 });

module.exports = mongoose.model('Device', deviceSchema);
