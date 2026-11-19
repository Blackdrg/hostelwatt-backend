const mongoose = require('mongoose');

const billSchema = new mongoose.Schema({
  billNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true,
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    default: null,
  },
  billingMonth: {
    type: Number, // 1-12
    required: true,
  },
  billingYear: {
    type: Number,
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  previousReadingKwh: {
    type: Number,
    required: true,
    default: 0,
  },
  currentReadingKwh: {
    type: Number,
    required: true,
    default: 0,
  },
  unitsConsumedKwh: {
    type: Number,
    required: true,
    default: 0,
  },
  tariffPerUnit: {
    type: Number,
    required: true,
  },
  energyCharge: {
    type: Number,
    required: true,
  },
  fixedCharge: {
    type: Number,
    default: 0,
  },
  taxAmount: {
    type: Number,
    default: 0,
  },
  totalAmount: {
    type: Number,
    required: true,
  },
  status: {
    type: String,
    enum: ['unpaid', 'paid', 'overdue'],
    default: 'unpaid',
  },
  dueDate: {
    type: Date,
    required: true,
  },
  paidAt: {
    type: Date,
    default: null,
  },
  paymentMethod: {
    type: String,
    default: null, // 'UPI', 'NetBanking', 'Card', 'Cash', 'Simulated'
  },
  transactionId: {
    type: String,
    default: null,
  },
  notes: {
    type: String,
    default: '',
  }
}, {
  timestamps: true,
});

billSchema.index({ room: 1, billingYear: 1, billingMonth: 1 });
billSchema.index({ student: 1 });
billSchema.index({ status: 1 });

module.exports = mongoose.model('Bill', billSchema);
