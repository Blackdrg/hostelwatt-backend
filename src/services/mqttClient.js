const mqtt = require('mqtt');
const Device = require('../models/Device');
const Room = require('../models/Room');
const EnergyReading = require('../models/EnergyReading');
const { checkReadingAlerts } = require('./alertService');
const { emitEnergyReading, emitDeviceStatus } = require('../config/socket');

let client = null;

const initMqttClient = () => {
  const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://127.0.0.1:1883';
  
  console.log(`[MQTT Client] Connecting to broker at: ${brokerUrl}`);
  client = mqtt.connect(brokerUrl, {
    clientId: `hostelwatt_backend_${Math.random().toString(16).substring(2, 8)}`,
    clean: true,
    connectTimeout: 4000,
    reconnectPeriod: 5000,
  });

  client.on('connect', () => {
    console.log('[MQTT Client] Connected successfully to MQTT Broker');
    
    // Subscribe to wildcard device telemetry and status topics
    client.subscribe([
      'hostelwatt/devices/+/reading',
      'hostelwatt/devices/+/status',
      'hostelwatt/devices/+/register'
    ], (err) => {
      if (err) {
        console.error('[MQTT Client] Subscription error:', err);
      } else {
        console.log('[MQTT Client] Subscribed to device telemetry topics');
      }
    });
  });

  client.on('message', async (topic, message) => {
    try {
      const payloadStr = message.toString();
      const payload = JSON.parse(payloadStr);
      // console.log(`[MQTT] Received message on ${topic}:`, payload);

      if (topic.endsWith('/reading')) {
        await handleReadingMessage(payload);
      } else if (topic.endsWith('/status')) {
        await handleStatusMessage(payload);
      } else if (topic.endsWith('/register')) {
        await handleRegisterMessage(payload);
      }
    } catch (err) {
      console.error('[MQTT Client] Error processing message:', err.message);
    }
  });

  client.on('error', (err) => {
    console.warn(`[MQTT Client] Connection warning: ${err.message}`);
  });

  return client;
};

const handleReadingMessage = async (payload) => {
  const {
    deviceId,
    voltage = 230.0,
    current = 0.0,
    powerKw = 0.0,
    powerFactor = 0.95,
    energyKwh = 0.0,
    frequency = 50.0
  } = payload;

  if (!deviceId) return;

  // Find or create device
  let device = await Device.findOne({ deviceId });
  if (!device) {
    device = await Device.create({
      deviceId,
      name: `ESP32 Smart Meter ${deviceId}`,
      macAddress: payload.macAddress || `24:6F:28:${Math.floor(10 + Math.random()*89)}:${Math.floor(10 + Math.random()*89)}:${Math.floor(10 + Math.random()*89)}`,
      status: 'online',
      lastSeen: new Date(),
      lastVoltage: voltage,
      lastCurrent: current,
      lastPowerKw: powerKw,
      lastPowerFactor: powerFactor,
      cumulativeKwh: energyKwh,
    });
  } else {
    device.status = 'online';
    device.lastSeen = new Date();
    device.lastVoltage = voltage;
    device.lastCurrent = current;
    device.lastPowerKw = powerKw;
    device.lastPowerFactor = powerFactor;
    device.cumulativeKwh = Math.max(device.cumulativeKwh || 0, energyKwh);
    await device.save();
  }

  // Populate Room
  let room = null;
  if (device.room) {
    room = await Room.findById(device.room);
  }

  // Check safety/abnormal consumption alerts
  const alertCheck = await checkReadingAlerts(
    { voltage, current, powerKw, energyKwh },
    room,
    device
  );

  // If room is assigned, persist energy reading in database
  let readingDoc = null;
  if (room) {
    readingDoc = await EnergyReading.create({
      device: device._id,
      room: room._id,
      timestamp: new Date(),
      voltage,
      current,
      powerKw,
      powerFactor,
      energyKwh: device.cumulativeKwh,
      frequency,
      isAbnormal: alertCheck.isAbnormal,
      alertReason: alertCheck.reason,
    });
  }

  // Broadcast real-time reading over Socket.IO to connected dashboards
  emitEnergyReading({
    deviceId: device.deviceId,
    voltage,
    current,
    powerKw,
    powerFactor,
    energyKwh: device.cumulativeKwh,
    frequency,
    timestamp: new Date().toISOString(),
    isAbnormal: alertCheck.isAbnormal,
    alertReason: alertCheck.reason,
    room: room ? {
      _id: room._id,
      roomNumber: room.roomNumber,
      block: room.block,
      floor: room.floor,
      status: room.status
    } : null
  }, room);
};

const handleStatusMessage = async (payload) => {
  const { deviceId, status, ipAddress, firmwareVersion } = payload;
  if (!deviceId) return;

  const device = await Device.findOne({ deviceId });
  if (device) {
    if (status) device.status = status;
    if (ipAddress) device.ipAddress = ipAddress;
    if (firmwareVersion) device.firmwareVersion = firmwareVersion;
    device.lastSeen = new Date();
    await device.save();
    emitDeviceStatus(device);
  }
};

const handleRegisterMessage = async (payload) => {
  const { deviceId, macAddress, roomNumber, firmwareVersion, ipAddress } = payload;
  if (!deviceId) return;

  let room = null;
  if (roomNumber) {
    room = await Room.findOne({ roomNumber });
  }

  let device = await Device.findOne({ deviceId });
  if (!device) {
    device = await Device.create({
      deviceId,
      name: `ESP32 Smart Meter ${deviceId}`,
      macAddress: macAddress || `24:6F:28:AB:CD:${deviceId.slice(-2)}`,
      room: room ? room._id : null,
      ipAddress: ipAddress || '192.168.1.150',
      firmwareVersion: firmwareVersion || 'v1.2.0',
      status: 'online',
      lastSeen: new Date()
    });
  } else {
    if (room && !device.room) {
      device.room = room._id;
    }
    device.status = 'online';
    device.lastSeen = new Date();
    await device.save();
  }

  if (room && (!room.assignedDevice || room.assignedDevice.toString() !== device._id.toString())) {
    room.assignedDevice = device._id;
    await room.save();
  }

  console.log(`[MQTT Client] Device registered: ${deviceId} for Room ${roomNumber || 'None'}`);
};

const publishToDevice = (deviceId, subTopic, payload) => {
  if (!client || !client.connected) return false;
  const topic = `hostelwatt/devices/${deviceId}/${subTopic}`;
  client.publish(topic, JSON.stringify(payload));
  return true;
};

module.exports = {
  initMqttClient,
  publishToDevice,
  getMqttClient: () => client
};
