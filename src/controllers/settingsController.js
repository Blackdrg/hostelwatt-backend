const Settings = require('../models/Settings');

// @desc    Get system settings
// @route   GET /api/settings
// @access  Public (for tariffs/hostel info) / Private
const getSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update system settings
// @route   PUT /api/settings
// @access  Admin
const updateSettings = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = new Settings();
    }

    const {
      hostelName,
      tariffPerKwh,
      fixedChargePerMonth,
      taxRatePercent,
      currency,
      currencySymbol,
      abnormalPowerThresholdKw,
      vacantPowerThresholdKw,
      deviceOfflineTimeoutSec,
      autoBillGenerationEnabled,
      autoBillDayOfMonth,
      registrationEnabled,
      contactEmail,
      contactPhone,
      address,
    } = req.body;

    if (hostelName !== undefined) settings.hostelName = hostelName;
    if (tariffPerKwh !== undefined) settings.tariffPerKwh = Number(tariffPerKwh);
    if (fixedChargePerMonth !== undefined) settings.fixedChargePerMonth = Number(fixedChargePerMonth);
    if (taxRatePercent !== undefined) settings.taxRatePercent = Number(taxRatePercent);
    if (currency !== undefined) settings.currency = currency;
    if (currencySymbol !== undefined) settings.currencySymbol = currencySymbol;
    if (abnormalPowerThresholdKw !== undefined) settings.abnormalPowerThresholdKw = Number(abnormalPowerThresholdKw);
    if (vacantPowerThresholdKw !== undefined) settings.vacantPowerThresholdKw = Number(vacantPowerThresholdKw);
    if (deviceOfflineTimeoutSec !== undefined) settings.deviceOfflineTimeoutSec = Number(deviceOfflineTimeoutSec);
    if (autoBillGenerationEnabled !== undefined) settings.autoBillGenerationEnabled = autoBillGenerationEnabled;
    if (autoBillDayOfMonth !== undefined) settings.autoBillDayOfMonth = Number(autoBillDayOfMonth);
    if (registrationEnabled !== undefined) settings.registrationEnabled = registrationEnabled;
    if (contactEmail !== undefined) settings.contactEmail = contactEmail;
    if (contactPhone !== undefined) settings.contactPhone = contactPhone;
    if (address !== undefined) settings.address = address;

    await settings.save();

    res.json({
      success: true,
      message: 'System settings updated successfully',
      data: settings,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getSettings,
  updateSettings,
};
