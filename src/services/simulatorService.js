const Device = require('../models/Device');
const Room = require('../models/Room');
const { getMqttClient } = require('./mqttClient');

let simulatorInterval = null;
let isSimulatorRunning = false;
let simulationSpeedMs = 4000; // reading every 4 seconds

// Room load profiles for realistic variations
const loadProfiles = {
  active_study: { minAmps: 0.8, maxAmps: 2.5, pf: 0.95 },
  heavy_cooling: { minAmps: 6.0, maxAmps: 9.5, pf: 0.91 },
  sleep_standby: { minAmps: 0.2, maxAmps: 0.6, pf: 0.98 },
  surge_load: { minAmps: 16.0, maxAmps: 18.5, pf: 0.89 }, // > 3.5kW trigger
  vacant_leak: { minAmps: 0.9, maxAmps: 1.4, pf: 0.94 }, // ~200W-300W on vacant room
};

const tickSimulation = async () => {
  try {
    const devices = await Device.find({}).populate('room');
    if (!devices || devices.length === 0) return;

    const mqttClient = getMqttClient();

    for (const dev of devices) {
      if (dev.status === 'error') continue;

      const room = dev.room;
      let profile = loadProfiles.active_study;

      // Determine profile based on room status
      if (room && room.status === 'vacant') {
        // Mostly almost 0, but randomly 15% chance to simulate forgotten appliance
        profile = Math.random() < 0.25 ? loadProfiles.vacant_leak : { minAmps: 0.0, maxAmps: 0.05, pf: 0.99 };
      } else {
        // Occupied room: varying between standby, active study, and heavy cooling
        const rand = Math.random();
        if (rand < 0.03) {
          // Rare sudden spike
          profile = loadProfiles.surge_load;
        } else if (rand < 0.40) {
          profile = loadProfiles.heavy_cooling;
        } else if (rand < 0.85) {
          profile = loadProfiles.active_study;
        } else {
          profile = loadProfiles.sleep_standby;
        }
      }

      // Generate physics-accurate readings
      const voltage = Number((228 + Math.random() * 6).toFixed(1)); // 228 - 234 V
      const current = Number((profile.minAmps + Math.random() * (profile.maxAmps - profile.minAmps)).toFixed(2));
      const powerFactor = Number((profile.pf + (Math.random() * 0.04 - 0.02)).toFixed(2));
      const powerKw = Number(((voltage * current * powerFactor) / 1000).toFixed(3));
      const frequency = Number((49.95 + Math.random() * 0.1).toFixed(2));

      // Calculate kWh delta for interval: P(kW) * (dt in hours)
      const hoursPassed = (simulationSpeedMs / 1000) / 3600;
      const incrementalKwh = powerKw * hoursPassed;
      const energyKwh = Number(((dev.cumulativeKwh || 120.5) + incrementalKwh).toFixed(4));

      const payload = {
        deviceId: dev.deviceId,
        macAddress: dev.macAddress,
        voltage,
        current,
        powerKw,
        powerFactor,
        energyKwh,
        frequency,
        timestamp: new Date().toISOString()
      };

      if (mqttClient && mqttClient.connected) {
        // Publish over MQTT topic
        const topic = `hostelwatt/devices/${dev.deviceId}/reading`;
        mqttClient.publish(topic, JSON.stringify(payload));
      } else {
        // If MQTT client is not connected, update directly through the handler
        const { handleReadingMessage } = require('./mqttClient');
        await handleReadingMessage(payload);
      }
    }
  } catch (err) {
    console.error('[Simulator] Tick error:', err.message);
  }
};

const startSimulator = (intervalMs = 4000) => {
  if (isSimulatorRunning) return;
  simulationSpeedMs = intervalMs;
  isSimulatorRunning = true;
  simulatorInterval = setInterval(tickSimulation, simulationSpeedMs);
  console.log(`[Simulator] ESP32 Device Simulator STARTED (Interval: ${simulationSpeedMs}ms)`);
};

const stopSimulator = () => {
  if (!isSimulatorRunning) return;
  if (simulatorInterval) {
    clearInterval(simulatorInterval);
    simulatorInterval = null;
  }
  isSimulatorRunning = false;
  console.log('[Simulator] ESP32 Device Simulator STOPPED');
};

const triggerSurgeSimulation = async (deviceId) => {
  const dev = await Device.findOne({ deviceId });
  if (!dev) return false;

  const voltage = 230.5;
  const current = 18.2; // 18.2A * 230.5V = 4.19 kW
  const powerFactor = 0.92;
  const powerKw = Number(((voltage * current * powerFactor) / 1000).toFixed(3));
  const energyKwh = Number(((dev.cumulativeKwh || 100) + 0.1).toFixed(3));

  const payload = {
    deviceId: dev.deviceId,
    macAddress: dev.macAddress,
    voltage,
    current,
    powerKw,
    powerFactor,
    energyKwh,
    frequency: 50.0,
    timestamp: new Date().toISOString()
  };

  const mqttClient = getMqttClient();
  if (mqttClient && mqttClient.connected) {
    mqttClient.publish(`hostelwatt/devices/${dev.deviceId}/reading`, JSON.stringify(payload));
  }
  return true;
};

module.exports = {
  startSimulator,
  stopSimulator,
  triggerSurgeSimulation,
  isSimulatorRunning: () => isSimulatorRunning,
  getSimulatorStatus: () => ({
    isRunning: isSimulatorRunning,
    intervalMs: simulationSpeedMs,
  })
};
