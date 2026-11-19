const Device = require('../models/Device');
const Room = require('../models/Room');
const {
  startSimulator,
  stopSimulator,
  isSimulatorRunning,
  getSimulatorStatus,
  triggerSurgeSimulation
} = require('../services/simulatorService');

// @desc    Get all devices
// @route   GET /api/devices
// @access  Admin, Management
const getDevices = async (req, res) => {
  try {
    const { status, room } = req.query;
    let query = {};

    if (status) query.status = status;
    if (room) query.room = room;

    const devices = await Device.find(query)
      .populate('room', 'roomNumber block floor')
      .sort({ deviceId: 1 });

    res.json({
      success: true,
      count: devices.length,
      data: devices,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single device
// @route   GET /api/devices/:id
// @access  Admin, Management
const getDeviceById = async (req, res) => {
  try {
    const device = await Device.findById(req.params.id).populate('room');
    if (!device) {
      return res.status(404).json({ success: false, message: 'Device not found' });
    }
    res.json({ success: true, data: device });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Register / Add new device
// @route   POST /api/devices
// @access  Admin
const createDevice = async (req, res) => {
  try {
    const { deviceId, name, macAddress, roomId, ipAddress, firmwareVersion, samplingIntervalSec } = req.body;

    const exists = await Device.findOne({ $or: [{ deviceId }, { macAddress }] });
    if (exists) {
      return res.status(400).json({
        success: false,
        message: 'A device with this Device ID or MAC Address already exists',
      });
    }

    const device = await Device.create({
      deviceId,
      name: name || `ESP32 Meter ${deviceId}`,
      macAddress,
      room: roomId || null,
      ipAddress: ipAddress || '192.168.1.100',
      firmwareVersion: firmwareVersion || 'v1.2.0',
      samplingIntervalSec: samplingIntervalSec || 10,
      status: 'online',
      lastSeen: new Date(),
    });

    if (roomId) {
      await Room.findByIdAndUpdate(roomId, { assignedDevice: device._id });
    }

    const populated = await Device.findById(device._id).populate('room');
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update device
// @route   PUT /api/devices/:id
// @access  Admin
const updateDevice = async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);
    if (!device) {
      return res.status(404).json({ success: false, message: 'Device not found' });
    }

    const { name, roomId, ipAddress, firmwareVersion, status, samplingIntervalSec } = req.body;

    if (name) device.name = name;
    if (ipAddress) device.ipAddress = ipAddress;
    if (firmwareVersion) device.firmwareVersion = firmwareVersion;
    if (status) device.status = status;
    if (samplingIntervalSec) device.samplingIntervalSec = samplingIntervalSec;

    // Room linkage
    if (roomId !== undefined) {
      if (device.room && String(device.room) !== String(roomId)) {
        await Room.findByIdAndUpdate(device.room, { assignedDevice: null });
      }

      if (roomId) {
        await Room.findByIdAndUpdate(roomId, { assignedDevice: device._id });
        device.room = roomId;
      } else {
        device.room = null;
      }
    }

    await device.save();
    const updated = await Device.findById(device._id).populate('room');

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete device
// @route   DELETE /api/devices/:id
// @access  Admin
const deleteDevice = async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);
    if (!device) {
      return res.status(404).json({ success: false, message: 'Device not found' });
    }

    if (device.room) {
      await Room.findByIdAndUpdate(device.room, { assignedDevice: null });
    }

    await Device.findByIdAndDelete(device._id);
    res.json({ success: true, message: 'Device deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle simulator on/off
// @route   POST /api/devices/simulator/toggle
// @access  Admin
const toggleSimulator = async (req, res) => {
  try {
    const { running, intervalMs = 4000 } = req.body;

    if (running) {
      startSimulator(intervalMs);
    } else {
      stopSimulator();
    }

    res.json({
      success: true,
      data: getSimulatorStatus(),
      message: `ESP32 Simulator is now ${isSimulatorRunning() ? 'RUNNING' : 'STOPPED'}`
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get simulator status
// @route   GET /api/devices/simulator/status
// @access  Public / Private
const getSimulatorInfo = async (req, res) => {
  res.json({
    success: true,
    data: getSimulatorStatus()
  });
};

// @desc    Trigger simulated power surge to test alert system
// @route   POST /api/devices/simulator/trigger-surge
// @access  Admin
const triggerSurge = async (req, res) => {
  try {
    const { deviceId } = req.body;
    let targetId = deviceId;

    if (!targetId) {
      const dev = await Device.findOne({ status: 'online' });
      if (dev) targetId = dev.deviceId;
    }

    if (!targetId) {
      return res.status(400).json({ success: false, message: 'No online device available to simulate surge' });
    }

    await triggerSurgeSimulation(targetId);

    res.json({
      success: true,
      message: `Simulated high voltage/current surge injected into meter ${targetId}. Check alerts in a few seconds!`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getDevices,
  getDeviceById,
  createDevice,
  updateDevice,
  deleteDevice,
  toggleSimulator,
  getSimulatorInfo,
  triggerSurge,
};
