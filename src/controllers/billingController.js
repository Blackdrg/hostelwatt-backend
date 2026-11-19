const Bill = require('../models/Bill');
const Room = require('../models/Room');
const Student = require('../models/Student');
const Settings = require('../models/Settings');
const { calculateRoomBill, generateMonthlyBillsForAllRooms } = require('../services/billingService');

// @desc    Get all bills
// @route   GET /api/billing
// @access  Admin, Management
const getBills = async (req, res) => {
  try {
    const { month, year, status, roomId } = req.query;
    let query = {};

    if (month) query.billingMonth = Number(month);
    if (year) query.billingYear = Number(year);
    if (status) query.status = status;
    if (roomId) query.room = roomId;

    const bills = await Bill.find(query)
      .populate('room', 'roomNumber block floor')
      .populate({
        path: 'student',
        populate: { path: 'user', select: 'name email phone' }
      })
      .sort({ billingYear: -1, billingMonth: -1, createdAt: -1 });

    res.json({
      success: true,
      count: bills.length,
      data: bills,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single bill
// @route   GET /api/billing/:id
// @access  Private
const getBillById = async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id)
      .populate('room')
      .populate({
        path: 'student',
        populate: { path: 'user', select: 'name email phone' }
      });

    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }

    const settings = await Settings.findOne() || {};

    res.json({
      success: true,
      data: {
        ...bill.toObject(),
        hostelSettings: settings,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Generate bill for single room
// @route   POST /api/billing/generate-room
// @access  Admin, Management
const generateRoomBill = async (req, res) => {
  try {
    const { roomId, month, year } = req.body;

    if (!roomId) {
      return res.status(400).json({ success: false, message: 'roomId is required' });
    }

    const currentYear = year || new Date().getFullYear();
    const currentMonth = month || (new Date().getMonth() + 1);

    const bill = await calculateRoomBill({
      roomId,
      year: Number(currentYear),
      month: Number(currentMonth),
      forceRegenerate: true,
    });

    const populated = await Bill.findById(bill._id)
      .populate('room')
      .populate({
        path: 'student',
        populate: { path: 'user', select: 'name email' }
      });

    res.status(201).json({
      success: true,
      message: `Electricity bill generated successfully for Room`,
      data: populated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Generate monthly bills for all rooms
// @route   POST /api/billing/generate-all
// @access  Admin, Management
const generateMonthlyBills = async (req, res) => {
  try {
    const { month, year } = req.body;
    const currentYear = year || new Date().getFullYear();
    const currentMonth = month || (new Date().getMonth() + 1);

    const bills = await generateMonthlyBillsForAllRooms(Number(currentYear), Number(currentMonth));

    res.status(201).json({
      success: true,
      message: `Generated ${bills.length} bills for Month ${currentMonth}/${currentYear}`,
      count: bills.length,
      data: bills,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update bill status (Mark as paid/unpaid)
// @route   PUT /api/billing/:id/status
// @access  Admin, Management, Student (for simulated payments)
const updateBillStatus = async (req, res) => {
  try {
    const { status, paymentMethod, transactionId } = req.body;
    const bill = await Bill.findById(req.params.id);

    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }

    bill.status = status;
    if (status === 'paid') {
      bill.paidAt = new Date();
      bill.paymentMethod = paymentMethod || 'Online Gateway';
      bill.transactionId = transactionId || `TXN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    } else {
      bill.paidAt = null;
      bill.paymentMethod = null;
      bill.transactionId = null;
    }

    await bill.save();

    const populated = await Bill.findById(bill._id)
      .populate('room')
      .populate({
        path: 'student',
        populate: { path: 'user', select: 'name email' }
      });

    res.json({
      success: true,
      message: `Bill status updated to ${status.toUpperCase()}`,
      data: populated,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get overall billing financial stats
// @route   GET /api/billing/stats
// @access  Admin, Management
const getBillingStats = async (req, res) => {
  try {
    const bills = await Bill.find({});

    const totalBilled = Number(bills.reduce((acc, b) => acc + b.totalAmount, 0).toFixed(2));
    const paidBills = bills.filter(b => b.status === 'paid');
    const totalCollected = Number(paidBills.reduce((acc, b) => acc + b.totalAmount, 0).toFixed(2));
    const pendingDues = Number((totalBilled - totalCollected).toFixed(2));
    const collectionRate = totalBilled > 0 ? Number(((totalCollected / totalBilled) * 100).toFixed(1)) : 100;

    res.json({
      success: true,
      data: {
        totalBilled,
        totalCollected,
        pendingDues,
        collectionRate,
        totalBillsCount: bills.length,
        paidBillsCount: paidBills.length,
        unpaidBillsCount: bills.length - paidBills.length,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get student's own room bills
// @route   GET /api/billing/student/my-bills
// @access  Student
const getStudentBills = async (req, res) => {
  try {
    const student = await Student.findOne({ user: req.user._id });
    if (!student || !student.room) {
      return res.json({ success: true, count: 0, data: [] });
    }

    const bills = await Bill.find({ room: student.room })
      .populate('room')
      .sort({ billingYear: -1, billingMonth: -1 });

    res.json({
      success: true,
      count: bills.length,
      data: bills,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getBills,
  getBillById,
  generateRoomBill,
  generateMonthlyBills,
  updateBillStatus,
  getBillingStats,
  getStudentBills,
};
