const Notification = require('../models/Notification');
const Device = require('../models/Device');
const Room = require('../models/Room');
const Settings = require('../models/Settings');
const { emitAlert } = require('../config/socket');

// Cache to prevent duplicate alert spamming within a short window (e.g. 15 minutes)
const recentAlertsCache = new Map();

const shouldAlert = (key, cooldownMs = 15 * 60 * 1000) => {
  const lastTime = recentAlertsCache.get(key);
  const now = Date.now();
  if (lastTime && now - lastTime < cooldownMs) {
    return false;
  }
  recentAlertsCache.set(key, now);
  return true;
};

const checkReadingAlerts = async (reading, room, device) => {
  try {
    const settings = await Settings.findOne() || {
      abnormalPowerThresholdKw: 3.5,
      vacantPowerThresholdKw: 0.15
    };

    // 1. High consumption / Abnormal spike alert
    if (reading.powerKw >= settings.abnormalPowerThresholdKw) {
      const cacheKey = `high_power:${room ? room._id : device._id}`;
      if (shouldAlert(cacheKey, 10 * 60 * 1000)) {
        const notif = await Notification.create({
          title: `High Electricity Surge Alert: Room ${room ? room.roomNumber : 'Unknown'}`,
          message: `Device ${device.deviceId} in Room ${room ? room.roomNumber : 'Unassigned'} reached ${reading.powerKw.toFixed(2)} kW, exceeding the safety threshold of ${settings.abnormalPowerThresholdKw} kW. Please inspect heavy appliances immediately.`,
          type: 'alert',
          severity: 'critical',
          targetRole: 'all',
          room: room ? room._id : null,
          device: device._id,
          metadata: {
            powerKw: reading.powerKw,
            threshold: settings.abnormalPowerThresholdKw,
            voltage: reading.voltage,
            current: reading.current,
          }
        });
        emitAlert(notif);
        return { isAbnormal: true, reason: `Power spike ${reading.powerKw.toFixed(2)} kW > ${settings.abnormalPowerThresholdKw} kW` };
      }
    }

    // 2. Vacant room appliance running alert
    if (room && room.status === 'vacant' && reading.powerKw >= settings.vacantPowerThresholdKw) {
      const cacheKey = `vacant_load:${room._id}`;
      if (shouldAlert(cacheKey, 20 * 60 * 1000)) {
        const notif = await Notification.create({
          title: `Unattended Appliance Alert: Vacant Room ${room.roomNumber}`,
          message: `Room ${room.roomNumber} is registered as VACANT but is actively drawing ${(reading.powerKw * 1000).toFixed(0)} W of power. Lights, fans or AC may have been left turned on.`,
          type: 'warning',
          severity: 'warning',
          targetRole: 'management',
          room: room._id,
          device: device._id,
          metadata: {
            powerKw: reading.powerKw,
            roomStatus: room.status,
          }
        });
        emitAlert(notif);
        return { isAbnormal: true, reason: `Vacant room appliance running (${(reading.powerKw * 1000).toFixed(0)} W)` };
      }
    }

    return { isAbnormal: false, reason: null };
  } catch (err) {
    console.error('[AlertService] Error checking reading alerts:', err);
    return { isAbnormal: false, reason: null };
  }
};

const checkOfflineDevices = async () => {
  try {
    const settings = await Settings.findOne() || { deviceOfflineTimeoutSec: 60 };
    const cutoffTime = new Date(Date.now() - settings.deviceOfflineTimeoutSec * 1000);

    const offlineDevices = await Device.find({
      status: 'online',
      lastSeen: { $lt: cutoffTime }
    }).populate('room');

    for (const dev of offlineDevices) {
      dev.status = 'offline';
      await dev.save();

      const notif = await Notification.create({
        title: `IoT Meter Offline: ${dev.deviceId}`,
        message: `ESP32 Smart Meter ${dev.deviceId} (${dev.name}) installed in Room ${dev.room ? dev.room.roomNumber : 'Unassigned'} has not sent heartbeats for over ${settings.deviceOfflineTimeoutSec}s. Status updated to OFFLINE.`,
        type: 'device',
        severity: 'warning',
        targetRole: 'admin',
        device: dev._id,
        room: dev.room ? dev.room._id : null,
      });

      emitAlert(notif);
    }
  } catch (err) {
    console.error('[AlertService] Error checking offline devices:', err);
  }
};

module.exports = {
  checkReadingAlerts,
  checkOfflineDevices
};
