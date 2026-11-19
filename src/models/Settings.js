const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  hostelName: {
    type: String,
    default: 'Grand Heights Smart Hostel',
  },
  tariffPerKwh: {
    type: Number,
    required: true,
    default: 8.50,
  },
  fixedChargePerMonth: {
    type: Number,
    default: 50.00,
  },
  taxRatePercent: {
    type: Number,
    default: 5.0,
  },
  currency: {
    type: String,
    default: 'INR',
  },
  currencySymbol: {
    type: String,
    default: '₹',
  },
  abnormalPowerThresholdKw: {
    type: Number,
    default: 3.5, // Alert if room exceeds 3.5 kW
  },
  vacantPowerThresholdKw: {
    type: Number,
    default: 0.15, // Alert if vacant room pulls > 150W
  },
  deviceOfflineTimeoutSec: {
    type: Number,
    default: 60, // Mark offline if no reading for 60s
  },
  autoBillGenerationEnabled: {
    type: Boolean,
    default: true,
  },
  autoBillDayOfMonth: {
    type: Number,
    default: 1, // 1st of every month
  },
  registrationEnabled: {
    type: Boolean,
    default: true,
  },
  contactEmail: {
    type: String,
    default: 'energy@hostelwatt.edu',
  },
  contactPhone: {
    type: String,
    default: '+91 98765 43210',
  },
  address: {
    type: String,
    default: 'Sector 42, Campus Green, Tech Valley',
  }
}, {
  timestamps: true,
});

module.exports = mongoose.model('Settings', settingsSchema);
