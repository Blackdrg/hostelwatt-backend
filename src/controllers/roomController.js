const Room = require('../models/Room');
const Device = require('../models/Device');
const Student = require('../models/Student');
const EnergyReading = require('../models/EnergyReading');

// @desc    Get all rooms
// @route   GET /api/rooms
// @access  Public / Private
const getRooms = async (req, res) => {
  try {
    const { block, floor, status, search } = req.query;
    let query = {};

    if (block) query.block = block;
    if (floor) query.floor = Number(floor);
    if (status) query.status = status;
    if (search) {
      query.roomNumber = { $regex: search, $options: 'i' };
    }

    const rooms = await Room.find(query)
      .populate('assignedDevice')
      .sort({ roomNumber: 1 });

    // Fetch occupants count and student summary for each room
    const roomsWithOccupants = await Promise.all(
      rooms.map(async (room) => {
        const students = await Student.find({ room: room._id, status: 'active' })
          .populate('user', 'name email phone avatar');

        return {
          ...room.toObject(),
          occupants: students,
          currentOccupancy: students.length,
          status: students.length > 0 ? 'occupied' : room.status === 'maintenance' ? 'maintenance' : 'vacant'
        };
      })
    );

    res.json({
      success: true,
      count: roomsWithOccupants.length,
      data: roomsWithOccupants,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single room
// @route   GET /api/rooms/:id
// @access  Private
const getRoomById = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id).populate('assignedDevice');
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    const students = await Student.find({ room: room._id, status: 'active' })
      .populate('user', 'name email phone avatar');

    // Fetch latest 20 energy readings for live chart
    const readings = await EnergyReading.find({ room: room._id })
      .sort({ timestamp: -1 })
      .limit(30);

    res.json({
      success: true,
      data: {
        ...room.toObject(),
        occupants: students,
        readings: readings.reverse(),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create room
// @route   POST /api/rooms
// @access  Admin, Management
const createRoom = async (req, res) => {
  try {
    const { roomNumber, floor, block, capacity, type, dailyTargetKwh, notes, deviceId } = req.body;

    const exists = await Room.findOne({ roomNumber });
    if (exists) {
      return res.status(400).json({ success: false, message: `Room ${roomNumber} already exists` });
    }

    let assignedDeviceObj = null;
    if (deviceId) {
      assignedDeviceObj = await Device.findById(deviceId);
    }

    const room = await Room.create({
      roomNumber,
      floor: floor || 1,
      block: block || 'A',
      capacity: capacity || 2,
      type: type || 'double',
      dailyTargetKwh: dailyTargetKwh || 5.0,
      notes: notes || '',
      assignedDevice: assignedDeviceObj ? assignedDeviceObj._id : null,
      status: 'vacant',
    });

    if (assignedDeviceObj) {
      assignedDeviceObj.room = room._id;
      await assignedDeviceObj.save();
    }

    res.status(201).json({
      success: true,
      data: room,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update room
// @route   PUT /api/rooms/:id
// @access  Admin, Management
const updateRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    const { roomNumber, floor, block, capacity, type, status, dailyTargetKwh, notes, deviceId } = req.body;

    if (roomNumber && roomNumber !== room.roomNumber) {
      const exists = await Room.findOne({ roomNumber });
      if (exists) {
        return res.status(400).json({ success: false, message: `Room ${roomNumber} already exists` });
      }
      room.roomNumber = roomNumber;
    }

    if (floor !== undefined) room.floor = floor;
    if (block !== undefined) room.block = block;
    if (capacity !== undefined) room.capacity = capacity;
    if (type !== undefined) room.type = type;
    if (status !== undefined) room.status = status;
    if (dailyTargetKwh !== undefined) room.dailyTargetKwh = dailyTargetKwh;
    if (notes !== undefined) room.notes = notes;

    // Handle device assignment
    if (deviceId !== undefined) {
      if (deviceId) {
        // Unlink device from other rooms if any
        await Room.updateMany({ assignedDevice: deviceId, _id: { $ne: room._id } }, { assignedDevice: null });
        await Device.findByIdAndUpdate(deviceId, { room: room._id });
        room.assignedDevice = deviceId;
      } else {
        if (room.assignedDevice) {
          await Device.findByIdAndUpdate(room.assignedDevice, { room: null });
        }
        room.assignedDevice = null;
      }
    }

    await room.save();
    const updated = await Room.findById(room._id).populate('assignedDevice');

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete room
// @route   DELETE /api/rooms/:id
// @access  Admin
const deleteRoom = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ success: false, message: 'Room not found' });
    }

    // Check if students reside in room
    const students = await Student.find({ room: room._id, status: 'active' });
    if (students.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete Room ${room.roomNumber}: currently has ${students.length} active student(s) assigned. Please reassign students first.`,
      });
    }

    // Unassign device
    if (room.assignedDevice) {
      await Device.findByIdAndUpdate(room.assignedDevice, { room: null });
    }

    await Room.findByIdAndDelete(room._id);

    res.json({ success: true, message: `Room ${room.roomNumber} deleted successfully` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
};
