const aedes = require('aedes');
const net = require('net');

let aedesServer = null;
let tcpServer = null;

const startMqttBroker = (port = 1883) => {
  return new Promise((resolve, reject) => {
    try {
      aedesServer = aedes();
      tcpServer = net.createServer(aedesServer.handle);

      tcpServer.listen(port, () => {
        console.log(`[MQTT Broker] Embedded Aedes broker listening on port ${port}`);
        resolve(aedesServer);
      });

      tcpServer.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          console.warn(`[MQTT Broker] Port ${port} is already in use (possibly external Mosquitto or existing broker). Skipping embedded broker startup.`);
          resolve(null);
        } else {
          console.error('[MQTT Broker] Error:', err);
          reject(err);
        }
      });

      aedesServer.on('client', (client) => {
        // console.log(`[MQTT Broker] Client connected: ${client ? client.id : 'unknown'}`);
      });

      aedesServer.on('clientDisconnect', (client) => {
        // console.log(`[MQTT Broker] Client disconnected: ${client ? client.id : 'unknown'}`);
      });

      aedesServer.on('publish', (packet, client) => {
        if (client) {
          // console.log(`[MQTT Broker] Packet published by ${client.id} on ${packet.topic}`);
        }
      });
    } catch (err) {
      console.error('[MQTT Broker] Initialization failed:', err);
      resolve(null);
    }
  });
};

const stopMqttBroker = () => {
  if (tcpServer) {
    tcpServer.close();
  }
  if (aedesServer) {
    aedesServer.close();
  }
};

module.exports = {
  startMqttBroker,
  stopMqttBroker,
  getAedes: () => aedesServer
};
