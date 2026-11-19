const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  rollNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  admissionNumber: {
    type: String,
    trim: true,
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    default: null,
  },
  course: {
    type: String,
    default: 'B.Tech Computer Science',
  },
  year: {
    type: Number,
    default: 1,
  },
  guardianName: {
    type: String,
    default: '',
  },
  guardianPhone: {
    type: String,
    default: '',
  },
  checkInDate: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['active', 'graduated', 'vacated', 'suspended'],
    default: 'active',
  }
}, {
  timestamps: true,
});

studentSchema.index({ room: 1 });

module.exports = mongoose.model('Student', studentSchema);
