const Bill = require('../models/Bill');
const Room = require('../models/Room');
const Student = require('../models/Student');
const EnergyReading = require('../models/EnergyReading');
const Settings = require('../models/Settings');
const Notification = require('../models/Notification');
const { emitBillUpdate, emitAlert } = require('../config/socket');

/**
 * Generate a unique bill invoice number: HW-YYYYMM-ROOM
 */
const generateBillNumber = (roomNumber, year, month) => {
  const m = String(month).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `HW-${year}${m}-R${roomNumber}-${rand}`;
};

/**
 * Calculate electricity bill for a room for a given billing period
 */
const calculateRoomBill = async ({ roomId, year, month, forceRegenerate = false }) => {
  const room = await Room.findById(roomId);
  if (!room) {
    throw new Error('Room not found');
  }

  // Check if a bill already exists for this room/month/year
  const existingBill = await Bill.findOne({
    room: roomId,
    billingYear: year,
    billingMonth: month
  });

  if (existingBill && !forceRegenerate) {
    return existingBill;
  }

  const settings = await Settings.findOne() || {
    tariffPerKwh: 8.50,
    fixedChargePerMonth: 50.00,
    taxRatePercent: 5.0
  };

  // Determine period boundaries
  const startDate = new Date(year, month - 1, 1, 0, 0, 0);
  const endDate = new Date(year, month, 0, 23, 59, 59, 999);

  // Retrieve readings for this room in period
  const readings = await EnergyReading.find({
    room: roomId,
    timestamp: { $gte: startDate, $lte: endDate }
  }).sort({ timestamp: 1 });

  let previousReadingKwh = 0;
  let currentReadingKwh = 0;
  let unitsConsumedKwh = 0;

  if (readings.length > 0) {
    previousReadingKwh = readings[0].energyKwh || 0;
    currentReadingKwh = readings[readings.length - 1].energyKwh || 0;
    unitsConsumedKwh = Math.max(0, currentReadingKwh - previousReadingKwh);
  } else {
    // If no specific period readings recorded yet, estimate based on current room device
    const device = await require('../models/Device').findOne({ room: roomId });
    if (device && device.cumulativeKwh > 0) {
      currentReadingKwh = device.cumulativeKwh;
      previousReadingKwh = Math.max(0, currentReadingKwh - 45); // simulated baseline
      unitsConsumedKwh = currentReadingKwh - previousReadingKwh;
    } else {
      // Default estimation
      unitsConsumedKwh = room.capacity * 35; // typical hostel room usage
      previousReadingKwh = 100;
      currentReadingKwh = 100 + unitsConsumedKwh;
    }
  }

  unitsConsumedKwh = Number(unitsConsumedKwh.toFixed(2));
  const tariffPerUnit = settings.tariffPerKwh;
  const energyCharge = Number((unitsConsumedKwh * tariffPerUnit).toFixed(2));
  const fixedCharge = Number(settings.fixedChargePerMonth.toFixed(2));
  const taxAmount = Number(((energyCharge + fixedCharge) * (settings.taxRatePercent / 100)).toFixed(2));
  const totalAmount = Number((energyCharge + fixedCharge + taxAmount).toFixed(2));

  // Due date is usually 15th of the following month
  const dueDate = new Date(year, month, 15);

  // Find students in this room
  const student = await Student.findOne({ room: roomId, status: 'active' });

  let bill;
  if (existingBill) {
    existingBill.previousReadingKwh = previousReadingKwh;
    existingBill.currentReadingKwh = currentReadingKwh;
    existingBill.unitsConsumedKwh = unitsConsumedKwh;
    existingBill.tariffPerUnit = tariffPerUnit;
    existingBill.energyCharge = energyCharge;
    existingBill.fixedCharge = fixedCharge;
    existingBill.taxAmount = taxAmount;
    existingBill.totalAmount = totalAmount;
    existingBill.dueDate = dueDate;
    bill = await existingBill.save();
  } else {
    bill = await Bill.create({
      billNumber: generateBillNumber(room.roomNumber, year, month),
      room: roomId,
      student: student ? student._id : null,
      billingMonth: month,
      billingYear: year,
      startDate,
      endDate,
      previousReadingKwh,
      currentReadingKwh,
      unitsConsumedKwh,
      tariffPerUnit,
      energyCharge,
      fixedCharge,
      taxAmount,
      totalAmount,
      status: 'unpaid',
      dueDate,
    });
  }

  // Create notifications
  const notif = await Notification.create({
    title: `Electricity Bill Generated: Room ${room.roomNumber}`,
    message: `Electricity bill for ${new Date(year, month - 1).toLocaleString('default', { month: 'long' })} ${year} is ready: ${settings.currencySymbol}${totalAmount} (${unitsConsumedKwh} kWh). Due date: ${dueDate.toLocaleDateString()}.`,
    type: 'bill',
    severity: 'info',
    targetRole: 'all',
    room: roomId,
    metadata: {
      billId: bill._id,
      billNumber: bill.billNumber,
      totalAmount,
      unitsConsumedKwh
    }
  });

  emitBillUpdate(bill);
  emitAlert(notif);

  return bill;
};

/**
 * Generate bills for all active rooms for current or specified month
 */
const generateMonthlyBillsForAllRooms = async (year, month) => {
  const rooms = await Room.find({});
  const results = [];

  for (const r of rooms) {
    try {
      const bill = await calculateRoomBill({
        roomId: r._id,
        year,
        month,
        forceRegenerate: true
      });
      results.push(bill);
    } catch (err) {
      console.error(`[BillingService] Error generating bill for Room ${r.roomNumber}:`, err.message);
    }
  }

  return results;
};

module.exports = {
  calculateRoomBill,
  generateMonthlyBillsForAllRooms,
  generateBillNumber
};
