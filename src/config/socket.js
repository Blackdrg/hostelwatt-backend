const { Server } = require('socket.io');

let io = null;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Join room-specific telemetry channel
    socket.on('join:room', (roomId) => {
      if (roomId) {
        socket.join(`room:${roomId}`);
        console.log(`[Socket] ${socket.id} joined channel room:${roomId}`);
      }
    });

    // Leave room
    socket.on('leave:room', (roomId) => {
      if (roomId) {
        socket.leave(`room:${roomId}`);
      }
    });

    // Join role channel (e.g. 'admin', 'student')
    socket.on('join:role', (role) => {
      if (role) {
        socket.join(`role:${role}`);
      }
    });

    socket.on('disconnect', () => {
      // console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  return io;
};

const emitEnergyReading = (reading, roomInfo) => {
  if (!io) return;
  // Broadcast to global energy monitor channel
  io.emit('energy:reading', {
    ...reading,
    room: roomInfo
  });

  // Also broadcast to room-specific subscribers
  if (reading.room) {
    const roomId = typeof reading.room === 'object' ? reading.room._id : reading.room;
    io.to(`room:${roomId}`).emit('room:energy:reading', reading);
  }
};

const emitDeviceStatus = (device) => {
  if (!io) return;
  io.emit('device:status', device);
};

const emitAlert = (alert) => {
  if (!io) return;
  io.emit('alert:new', alert);
  if (alert.targetRole) {
    io.to(`role:${alert.targetRole}`).emit('notification:new', alert);
  }
};

const emitBillUpdate = (bill) => {
  if (!io) return;
  io.emit('bill:update', bill);
};

module.exports = {
  initSocket,
  getIO,
  emitEnergyReading,
  emitDeviceStatus,
  emitAlert,
  emitBillUpdate
};
