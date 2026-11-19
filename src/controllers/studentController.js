const Student = require('../models/Student');
const User = require('../models/User');
const Room = require('../models/Room');
const EnergyReading = require('../models/EnergyReading');
const Bill = require('../models/Bill');
const Settings = require('../models/Settings');
const Notification = require('../models/Notification');

// @desc    Get all students
// @route   GET /api/students
// @access  Admin, Management
const getStudents = async (req, res) => {
  try {
    const { search, room, status } = req.query;
    let query = {};

    if (status) query.status = status;
    if (room) query.room = room;

    let students = await Student.find(query)
      .populate('user', 'name email phone avatar isActive')
      .populate('room', 'roomNumber block floor status')
      .sort({ createdAt: -1 });

    if (search) {
      const searchLower = search.toLowerCase();
      students = students.filter(s => 
        (s.user && s.user.name.toLowerCase().includes(searchLower)) ||
        (s.user && s.user.email.toLowerCase().includes(searchLower)) ||
        s.rollNumber.toLowerCase().includes(searchLower) ||
        (s.room && s.room.roomNumber.toLowerCase().includes(searchLower))
      );
    }

    res.json({
      success: true,
      count: students.length,
      data: students,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single student
// @route   GET /api/students/:id
// @access  Admin, Management, Student (self)
const getStudentById = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate('user', '-password')
      .populate('room');

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    res.json({ success: true, data: student });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create student
// @route   POST /api/students
// @access  Admin, Management
const createStudent = async (req, res) => {
  try {
    const {
      name,
      email,
      password = 'Password@123',
      phone,
      rollNumber,
      admissionNumber,
      roomId,
      course,
      year,
      guardianName,
      guardianPhone,
    } = req.body;

    // Check duplicate email
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'Email already exists' });
    }

    // Check duplicate roll number
    const rollExists = await Student.findOne({ rollNumber });
    if (rollExists) {
      return res.status(400).json({ success: false, message: 'Roll number already exists' });
    }

    // Create user account
    const user = await User.create({
      name,
      email,
      password,
      role: 'student',
      phone,
    });

    let assignedRoom = null;
    if (roomId) {
      assignedRoom = await Room.findById(roomId);
      if (assignedRoom) {
        if (assignedRoom.currentOccupancy >= assignedRoom.capacity) {
          return res.status(400).json({ success: false, message: 'Selected room is at full capacity' });
        }
        assignedRoom.currentOccupancy = (assignedRoom.currentOccupancy || 0) + 1;
        assignedRoom.status = 'occupied';
        await assignedRoom.save();
      }
    }

    const student = await Student.create({
      user: user._id,
      rollNumber,
      admissionNumber,
      room: assignedRoom ? assignedRoom._id : null,
      course,
      year,
      guardianName,
      guardianPhone,
    });

    const populatedStudent = await Student.findById(student._id)
      .populate('user', '-password')
      .populate('room');

    res.status(201).json({
      success: true,
      data: populatedStudent,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update student
// @route   PUT /api/students/:id
// @access  Admin, Management
const updateStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const {
      name,
      phone,
      roomId,
      course,
      year,
      guardianName,
      guardianPhone,
      status,
      isActive,
    } = req.body;

    // Update user details
    const user = await User.findById(student.user);
    if (user) {
      if (name) user.name = name;
      if (phone !== undefined) user.phone = phone;
      if (isActive !== undefined) user.isActive = isActive;
      await user.save();
    }

    // Handle room transfer if roomId changed
    if (roomId !== undefined && String(student.room) !== String(roomId)) {
      // Free old room spot
      if (student.room) {
        const oldRoom = await Room.findById(student.room);
        if (oldRoom) {
          oldRoom.currentOccupancy = Math.max(0, (oldRoom.currentOccupancy || 1) - 1);
          if (oldRoom.currentOccupancy === 0) oldRoom.status = 'vacant';
          await oldRoom.save();
        }
      }

      // Allocate new room spot
      if (roomId) {
        const newRoom = await Room.findById(roomId);
        if (newRoom) {
          newRoom.currentOccupancy = (newRoom.currentOccupancy || 0) + 1;
          newRoom.status = 'occupied';
          await newRoom.save();
          student.room = newRoom._id;
        }
      } else {
        student.room = null;
      }
    }

    if (course) student.course = course;
    if (year) student.year = year;
    if (guardianName !== undefined) student.guardianName = guardianName;
    if (guardianPhone !== undefined) student.guardianPhone = guardianPhone;
    if (status) student.status = status;

    await student.save();

    const updated = await Student.findById(student._id)
      .populate('user', '-password')
      .populate('room');

    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete student
// @route   DELETE /api/students/:id
// @access  Admin
const deleteStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    // Free room capacity
    if (student.room) {
      const room = await Room.findById(student.room);
      if (room) {
        room.currentOccupancy = Math.max(0, (room.currentOccupancy || 1) - 1);
        if (room.currentOccupancy === 0) room.status = 'vacant';
        await room.save();
      }
    }

    await User.findByIdAndDelete(student.user);
    await Student.findByIdAndDelete(student._id);

    res.json({ success: true, message: 'Student and associated user account deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Student portal overview summary
// @route   GET /api/students/me/dashboard
// @access  Student
const getStudentDashboard = async (req, res) => {
  try {
    const student = await Student.findOne({ user: req.user._id })
      .populate('room')
      .populate({
        path: 'room',
        populate: { path: 'assignedDevice' }
      });

    if (!student || !student.room) {
      return res.json({
        success: true,
        hasRoom: false,
        message: 'No room currently assigned. Please contact the hostel warden.',
        student,
      });
    }

    const roomId = student.room._id;
    const settings = await Settings.findOne() || { tariffPerKwh: 8.50, currencySymbol: '₹' };

    // Roommates in the same room
    const roommates = await Student.find({
      room: roomId,
      _id: { $ne: student._id },
      status: 'active'
    }).populate('user', 'name email phone avatar');

    // Today's consumption
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const todayReadings = await EnergyReading.find({
      room: roomId,
      timestamp: { $gte: startOfToday }
    }).sort({ timestamp: 1 });

    let todayKwh = 0;
    if (todayReadings.length > 1) {
      todayKwh = Math.max(0, todayReadings[todayReadings.length - 1].energyKwh - todayReadings[0].energyKwh);
    } else if (student.room.assignedDevice) {
      todayKwh = Math.max(0, (student.room.assignedDevice.lastPowerKw || 0.4) * 8); // approximate
    }

    // Current month consumption
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const monthReadings = await EnergyReading.find({
      room: roomId,
      timestamp: { $gte: startOfMonth }
    }).sort({ timestamp: 1 });

    let monthKwh = 0;
    if (monthReadings.length > 1) {
      monthKwh = Math.max(0, monthReadings[monthReadings.length - 1].energyKwh - monthReadings[0].energyKwh);
    } else {
      monthKwh = todayKwh * 14;
    }

    todayKwh = Number(todayKwh.toFixed(2));
    monthKwh = Number(monthKwh.toFixed(2));

    // Estimated current bill
    const estimatedBillAmount = Number((monthKwh * settings.tariffPerKwh + settings.fixedChargePerMonth).toFixed(2));

    // Recent bills
    const recentBills = await Bill.find({ room: roomId })
      .sort({ billingYear: -1, billingMonth: -1 })
      .limit(6);

    // Unpaid bills
    const unpaidBills = recentBills.filter(b => b.status === 'unpaid' || b.status === 'overdue');
    const totalDue = unpaidBills.reduce((acc, b) => acc + b.totalAmount, 0);

    // Recent notifications
    const notifications = await Notification.find({
      $or: [
        { room: roomId },
        { targetUser: req.user._id },
        { targetRole: { $in: ['all', 'student'] } }
      ]
    }).sort({ createdAt: -1 }).limit(5);

    res.json({
      success: true,
      hasRoom: true,
      student,
      room: student.room,
      roommates,
      device: student.room.assignedDevice,
      energy: {
        todayKwh,
        monthKwh,
        currentPowerKw: student.room.assignedDevice ? student.room.assignedDevice.lastPowerKw : 0,
        voltage: student.room.assignedDevice ? student.room.assignedDevice.lastVoltage : 230,
        current: student.room.assignedDevice ? student.room.assignedDevice.lastCurrent : 0,
        dailyTargetKwh: student.room.dailyTargetKwh || 5.0,
      },
      billing: {
        tariffPerKwh: settings.tariffPerKwh,
        currencySymbol: settings.currencySymbol,
        estimatedCurrentBill: estimatedBillAmount,
        totalDue,
        unpaidCount: unpaidBills.length,
        recentBills,
      },
      notifications,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  getStudentDashboard,
};
