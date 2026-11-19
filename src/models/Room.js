const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomNumber: {
    type: String,
    required: [true, 'Room number is required'],
    unique: true,
    trim: true,
  },
  floor: {
    type: Number,
    required: [true, 'Floor number is required'],
    default: 1,
  },
  block: {
    type: String,
    default: 'A',
    trim: true,
  },
  capacity: {
    type: Number,
    required: true,
    default: 2,
  },
  currentOccupancy: {
    type: Number,
    default: 0,
  },
  type: {
    type: String,
    enum: ['single', 'double', 'triple', 'dormitory'],
    default: 'double',
  },
  status: {
    type: String,
    enum: ['vacant', 'occupied', 'maintenance'],
    default: 'vacant',
  },
  assignedDevice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    default: null,
  },
  dailyTargetKwh: {
    type: Number,
    default: 5.0,
  },
  notes: {
    type: String,
    default: '',
  }
}, {
  timestamps: true,
});

roomSchema.index({ block: 1, floor: 1 });

module.exports = mongoose.model('Room', roomSchema);
