const mongoose = require('mongoose');

const energyReadingSchema = new mongoose.Schema({
  device: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: true,
  },
  room: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
  voltage: {
    type: Number,
    required: true,
    default: 230.0, // Volts
  },
  current: {
    type: Number,
    required: true,
    default: 0.0, // Amperes
  },
  powerKw: {
    type: Number,
    required: true,
    default: 0.0, // Kilowatts
  },
  powerFactor: {
    type: Number,
    default: 0.95,
  },
  energyKwh: {
    type: Number,
    required: true,
    default: 0.0, // Cumulative kWh reading
  },
  frequency: {
    type: Number,
    default: 50.0, // Hz
  },
  isAbnormal: {
    type: Boolean,
    default: false,
  },
  alertReason: {
    type: String,
    default: null,
  }
}, {
  timestamps: false,
});

energyReadingSchema.index({ room: 1, timestamp: -1 });
energyReadingSchema.index({ device: 1, timestamp: -1 });
energyReadingSchema.index({ timestamp: -1 });

module.exports = mongoose.model('EnergyReading', energyReadingSchema);
