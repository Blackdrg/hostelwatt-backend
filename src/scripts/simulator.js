const mqtt = require('mqtt');
const dotenv = require('dotenv');
dotenv.config();

const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://127.0.0.1:1883';
console.log(`[Standalone Simulator] Connecting to MQTT Broker at ${brokerUrl}...`);

const client = mqtt.connect(brokerUrl, {
  clientId: `standalone_esp32_simulator_${Math.random().toString(16).substring(2, 8)}`,
  clean: true,
});

const simulatedRooms = [
  { deviceId: 'ESP32_R101', roomNumber: '101', mac: '24:6F:28:A1:01:01', baseKwh: 142.8, active: true },
  { deviceId: 'ESP32_R102', roomNumber: '102', mac: '24:6F:28:A1:01:02', baseKwh: 86.4, active: true },
  { deviceId: 'ESP32_R103', roomNumber: '103', mac: '24:6F:28:A1:01:03', baseKwh: 12.3, active: false },
  { deviceId: 'ESP32_R201', roomNumber: '201', mac: '24:6F:28:B2:02:01', baseKwh: 188.2, active: true },
  { deviceId: 'ESP32_R202', roomNumber: '202', mac: '24:6F:28:B2:02:02', baseKwh: 115.6, active: true },
];

client.on('connect', () => {
  console.log('[Standalone Simulator] Connected to MQTT Broker! Broadcasting readings every 3 seconds...');

  setInterval(() => {
    simulatedRooms.forEach(node => {
      const voltage = Number((229 + Math.random() * 5).toFixed(1));
      let current = 0;
      let powerFactor = 0.95;

      if (node.active) {
        current = Number((0.8 + Math.random() * 4.2).toFixed(2));
      } else {
        // Vacant room with occasional leakage
        current = Math.random() < 0.2 ? Number((0.8 + Math.random() * 0.4).toFixed(2)) : 0.02;
      }

      const powerKw = Number(((voltage * current * powerFactor) / 1000).toFixed(3));
      node.baseKwh += Number((powerKw * (3 / 3600)).toFixed(4));

      const payload = {
        deviceId: node.deviceId,
        macAddress: node.mac,
        voltage,
        current,
        powerKw,
        powerFactor,
        energyKwh: Number(node.baseKwh.toFixed(3)),
        frequency: 50.0,
        timestamp: new Date().toISOString()
      };

      const topic = `hostelwatt/devices/${node.deviceId}/reading`;
      client.publish(topic, JSON.stringify(payload));
      console.log(`[MQTT TX] -> ${topic}: ${powerKw} kW | ${payload.energyKwh} kWh | ${voltage}V`);
    });
  }, 3000);
});

client.on('error', (err) => {
  console.error('[Standalone Simulator] MQTT Connection error:', err.message);
});
