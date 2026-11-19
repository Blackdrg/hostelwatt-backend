const Room = require('../models/Room');
const Bill = require('../models/Bill');
const Device = require('../models/Device');
const EnergyReading = require('../models/EnergyReading');

// @desc    Get comprehensive energy analytics report
// @route   GET /api/reports/energy-summary
// @access  Admin, Management
const getEnergyReport = async (req, res) => {
  try {
    const rooms = await Room.find({}).populate('assignedDevice');

    // Group energy by block
    const blockStats = {};
    const floorStats = {};

    rooms.forEach(room => {
      const b = room.block || 'A';
      const f = `Floor ${room.floor || 1}`;
      const kwh = room.assignedDevice ? (room.assignedDevice.cumulativeKwh || 0) : 0;
      const kw = room.assignedDevice ? (room.assignedDevice.lastPowerKw || 0) : 0;

      if (!blockStats[b]) blockStats[b] = { block: b, totalKwh: 0, currentKw: 0, roomCount: 0 };
      blockStats[b].totalKwh += kwh;
      blockStats[b].currentKw += kw;
      blockStats[b].roomCount += 1;

      if (!floorStats[f]) floorStats[f] = { floor: f, totalKwh: 0, currentKw: 0, roomCount: 0 };
      floorStats[f].totalKwh += kwh;
      floorStats[f].currentKw += kw;
      floorStats[f].roomCount += 1;
    });

    const blockList = Object.values(blockStats).map(b => ({
      ...b,
      totalKwh: Number(b.totalKwh.toFixed(1)),
      currentKw: Number(b.currentKw.toFixed(2)),
    }));

    const floorList = Object.values(floorStats).map(f => ({
      ...f,
      totalKwh: Number(f.totalKwh.toFixed(1)),
      currentKw: Number(f.currentKw.toFixed(2)),
    }));

    // Room efficiency analysis (kWh consumed per resident)
    const efficiencyList = rooms.map(r => {
      const kwh = r.assignedDevice ? (r.assignedDevice.cumulativeKwh || 0) : 0;
      const occ = r.currentOccupancy || 1;
      return {
        roomNumber: r.roomNumber,
        block: r.block,
        floor: r.floor,
        currentOccupancy: r.currentOccupancy,
        totalKwh: Number(kwh.toFixed(1)),
        kwhPerResident: Number((kwh / occ).toFixed(1)),
        status: r.status,
      };
    }).sort((a, b) => b.totalKwh - a.totalKwh);

    res.json({
      success: true,
      data: {
        byBlock: blockList,
        byFloor: floorList,
        roomEfficiency: efficiencyList,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get financial revenue and billing report
// @route   GET /api/reports/billing-summary
// @access  Admin, Management
const getFinancialReport = async (req, res) => {
  try {
    const bills = await Bill.find({}).populate('room', 'roomNumber block floor');

    // Group by month
    const monthlySummary = {};
    bills.forEach(bill => {
      const key = `${bill.billingYear}-${String(bill.billingMonth).padStart(2, '0')}`;
      if (!monthlySummary[key]) {
        monthlySummary[key] = {
          period: key,
          month: bill.billingMonth,
          year: bill.billingYear,
          totalBilled: 0,
          totalCollected: 0,
          unitsKwh: 0,
          billCount: 0,
        };
      }
      monthlySummary[key].totalBilled += bill.totalAmount;
      monthlySummary[key].unitsKwh += bill.unitsConsumedKwh;
      monthlySummary[key].billCount += 1;
      if (bill.status === 'paid') {
        monthlySummary[key].totalCollected += bill.totalAmount;
      }
    });

    const monthlyTrends = Object.values(monthlySummary).map(m => ({
      ...m,
      totalBilled: Number(m.totalBilled.toFixed(2)),
      totalCollected: Number(m.totalCollected.toFixed(2)),
      unitsKwh: Number(m.unitsKwh.toFixed(1)),
      collectionRate: m.totalBilled > 0 ? Number(((m.totalCollected / m.totalBilled) * 100).toFixed(1)) : 100
    })).sort((a, b) => a.period.localeCompare(b.period));

    res.json({
      success: true,
      data: {
        monthlyTrends,
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getEnergyReport,
  getFinancialReport,
};
