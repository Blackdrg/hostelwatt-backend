const http = require('http');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const { connectDB } = require('./config/db');
const { initSocket } = require('./config/socket');
const { startMqttBroker } = require('./services/mqttBroker');
const { initMqttClient } = require('./services/mqttClient');
const { startSimulator } = require('./services/simulatorService');
const { checkOfflineDevices } = require('./services/alertService');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

// Route imports
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const roomRoutes = require('./routes/roomRoutes');
const deviceRoutes = require('./routes/deviceRoutes');
const energyRoutes = require('./routes/energyRoutes');
const billingRoutes = require('./routes/billingRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const reportRoutes = require('./routes/reportRoutes');
const settingsRoutes = require('./routes/settingsRoutes');

const app = express();
const httpServer = http.createServer(app);

// Middlewares
const allowedOrigins = process.env.FRONTEND_URL 
  ? [process.env.FRONTEND_URL, process.env.FRONTEND_URL.replace(/\/$/, '')]
  : ['*'];

app.use(cors({
  origin: process.env.FRONTEND_URL ? allowedOrigins : '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Initialize WebSockets
const io = initSocket(httpServer);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'HostelWatt Backend API',
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/devices', deviceRoutes);
app.use('/api/energy', energyRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRoutes);

// Serve Frontend in production or when dist exists
const path = require('path');
const fs = require('fs');
const frontendDist = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
      return next();
    }
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Error Handling
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
const MQTT_PORT = process.env.MQTT_PORT || 1883;

// Server startup
const startServer = async () => {
  try {
    // 1. Connect MongoDB
    await connectDB();

    // Auto-seed if database has no users (e.g. fresh in-memory or new MongoDB)
    const User = require('./models/User');
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('[Server] Database is empty. Auto-seeding initial hostel accounts and devices...');
      const { seedData } = require('./scripts/seed');
      await seedData(false);
    }

    // 2. Start Embedded MQTT Broker (if enabled)
    if (process.env.ENABLE_EMBEDDED_MQTT !== 'false') {
      await startMqttBroker(Number(MQTT_PORT));
    }

    // 3. Connect internal MQTT Client to broker
    initMqttClient();

    // 4. Start HTTP & Socket server
    httpServer.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`⚡ HostelWatt Backend API running on port ${PORT}`);
      console.log(`📡 WebSocket ready on ws://localhost:${PORT}`);
      console.log(`🔌 MQTT Broker running on mqtt://localhost:${MQTT_PORT}`);
      console.log(`====================================================`);

      // 5. Start ESP32 Device Simulator by default for live interactive testing
      startSimulator(4000);

      // 6. Check for offline IoT meters every 30 seconds
      setInterval(checkOfflineDevices, 30000);
    });
  } catch (error) {
    console.error('Fatal Server Startup Error:', error);
    process.exit(1);
  }
};

startServer();

module.exports = { app, httpServer };
