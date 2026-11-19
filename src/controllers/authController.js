const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Student = require('../models/Student');
const Room = require('../models/Room');
const Settings = require('../models/Settings');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'hostelwatt_secret', {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { name, email, password, role = 'student', phone, rollNumber, roomNumber } = req.body;

    // Check if registration is enabled
    const settings = await Settings.findOne();
    if (settings && !settings.registrationEnabled && role === 'student') {
      return res.status(403).json({
        success: false,
        message: 'Public student registration is currently closed. Please contact the hostel admin.',
      });
    }

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists',
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role,
      phone,
    });

    let studentProfile = null;
    // If student, link or create student record
    if (role === 'student' && rollNumber) {
      let assignedRoom = null;
      if (roomNumber) {
        assignedRoom = await Room.findOne({ roomNumber });
        if (assignedRoom) {
          assignedRoom.currentOccupancy = (assignedRoom.currentOccupancy || 0) + 1;
          assignedRoom.status = 'occupied';
          await assignedRoom.save();
        }
      }

      studentProfile = await Student.create({
        user: user._id,
        rollNumber,
        room: assignedRoom ? assignedRoom._id : null,
      });
    }

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        avatar: user.avatar,
      },
      student: studentProfile,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password',
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. User not found.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Incorrect password.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact hostel administration.',
      });
    }

    const token = generateToken(user._id);

    let studentProfile = null;
    if (user.role === 'student') {
      studentProfile = await Student.findOne({ user: user._id })
        .populate('room')
        .populate({
          path: 'room',
          populate: { path: 'assignedDevice' }
        });
    }

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        avatar: user.avatar,
      },
      student: studentProfile,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    let studentProfile = null;

    if (user.role === 'student') {
      studentProfile = await Student.findOne({ user: user._id })
        .populate('room')
        .populate({
          path: 'room',
          populate: { path: 'assignedDevice' }
        });
    }

    res.json({
      success: true,
      user,
      student: studentProfile,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const { name, phone, avatar } = req.body;
    const user = await User.findById(req.user.id);

    if (name) user.name = name;
    if (phone !== undefined) user.phone = phone;
    if (avatar) user.avatar = avatar;

    await user.save();

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// @desc    Change password
// @route   PUT /api/auth/password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id);
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect',
      });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password updated successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  changePassword,
};
