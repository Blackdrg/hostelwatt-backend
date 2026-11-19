const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const { connectDB, disconnectDB } = require('../config/db');
const User = require('../models/User');
const Student = require('../models/Student');
const Room = require('../models/Room');
const Device = require('../models/Device');
const EnergyReading = require('../models/EnergyReading');
const Bill = require('../models/Bill');
const Notification = require('../models/Notification');
const Settings = require('../models/Settings');

const seedData = async (shouldConnect = true) => {
  try {
    console.log('[Seed] Starting database seed process...');
    if (shouldConnect) {
      await connectDB();
    }

    // Clear existing collections
    await User.deleteMany({});
    await Student.deleteMany({});
    await Room.deleteMany({});
    await Device.deleteMany({});
    await EnergyReading.deleteMany({});
    await Bill.deleteMany({});
    await Notification.deleteMany({});
    await Settings.deleteMany({});

    console.log('[Seed] Cleared existing database records.');

    // 1. Seed System Settings
    const settings = await Settings.create({
      hostelName: 'Grand Heights Smart Campus Hostel',
      tariffPerKwh: 8.50,
      fixedChargePerMonth: 50.00,
      taxRatePercent: 5.0,
      currency: 'INR',
      currencySymbol: '₹',
      abnormalPowerThresholdKw: 3.5,
      vacantPowerThresholdKw: 0.15,
      deviceOfflineTimeoutSec: 60,
      autoBillGenerationEnabled: true,
      autoBillDayOfMonth: 1,
      registrationEnabled: true,
      contactEmail: 'admin@hostelwatt.edu',
      contactPhone: '+91 98765 43210',
      address: 'Hostel Block A & B, North Campus, Tech University'
    });
    console.log('[Seed] Created system settings.');

    // 2. Create Users
    const adminUser = await User.create({
      name: 'System Administrator',
      email: 'admin@hostelwatt.com',
      password: 'admin123',
      role: 'admin',
      phone: '+91 99887 76655',
    });

    const managerUser = await User.create({
      name: 'Hostel Warden (Staff)',
      email: 'manager@hostelwatt.com',
      password: 'manager123',
      role: 'management',
      phone: '+91 98765 12345',
    });

    const studentUser1 = await User.create({
      name: 'Rahul Sharma',
      email: 'rahul@hostelwatt.com',
      password: 'student123',
      role: 'student',
      phone: '+91 91234 56789',
    });

    const studentUser2 = await User.create({
      name: 'Amit Patel',
      email: 'amit@hostelwatt.com',
      password: 'student123',
      role: 'student',
      phone: '+91 92345 67890',
    });

    const studentUser3 = await User.create({
      name: 'Priya Verma',
      email: 'priya@hostelwatt.com',
      password: 'student123',
      role: 'student',
      phone: '+91 93456 78901',
    });

    const studentUser4 = await User.create({
      name: 'Sneha Rao',
      email: 'sneha@hostelwatt.com',
      password: 'student123',
      role: 'student',
      phone: '+91 94567 89012',
    });

    const studentUser5 = await User.create({
      name: 'Vikram Singh',
      email: 'vikram@hostelwatt.com',
      password: 'student123',
      role: 'student',
      phone: '+91 95678 90123',
    });

    console.log('[Seed] Created Admin, Manager, and 5 Student users.');

    // 3. Create Rooms
    const room101 = await Room.create({
      roomNumber: '101',
      floor: 1,
      block: 'A',
      capacity: 2,
      currentOccupancy: 2,
      type: 'double',
      status: 'occupied',
      dailyTargetKwh: 5.0,
      notes: 'Near east staircase, dual ceiling fans & study desks',
    });

    const room102 = await Room.create({
      roomNumber: '102',
      floor: 1,
      block: 'A',
      capacity: 1,
      currentOccupancy: 1,
      type: 'single',
      status: 'occupied',
      dailyTargetKwh: 3.5,
      notes: 'Single room with inverter backup',
    });

    const room103 = await Room.create({
      roomNumber: '103',
      floor: 1,
      block: 'A',
      capacity: 2,
      currentOccupancy: 0,
      type: 'double',
      status: 'vacant',
      dailyTargetKwh: 1.0,
      notes: 'Vacant for semester renovation',
    });

    const room201 = await Room.create({
      roomNumber: '201',
      floor: 2,
      block: 'B',
      capacity: 2,
      currentOccupancy: 1,
      type: 'double',
      status: 'occupied',
      dailyTargetKwh: 5.5,
      notes: 'Balcony facing green courtyard',
    });

    const room202 = await Room.create({
      roomNumber: '202',
      floor: 2,
      block: 'B',
      capacity: 2,
      currentOccupancy: 1,
      type: 'double',
      status: 'occupied',
      dailyTargetKwh: 5.0,
      notes: 'Corner room with cross-ventilation',
    });

    const room203 = await Room.create({
      roomNumber: '203',
      floor: 2,
      block: 'B',
      capacity: 3,
      currentOccupancy: 0,
      type: 'triple',
      status: 'vacant',
      dailyTargetKwh: 1.0,
      notes: 'Triple sharing, unallocated',
    });

    console.log('[Seed] Created 6 hostel rooms.');

    // 4. Create Students & assign rooms
    const student1 = await Student.create({
      user: studentUser1._id,
      rollNumber: 'CS202401',
      admissionNumber: 'ADM-9011',
      room: room101._id,
      course: 'B.Tech Computer Science & AI',
      year: 3,
      guardianName: 'Ramesh Sharma',
      guardianPhone: '+91 98111 22334',
    });

    const student2 = await Student.create({
      user: studentUser2._id,
      rollNumber: 'CS202402',
      admissionNumber: 'ADM-9012',
      room: room101._id,
      course: 'B.Tech Computer Science',
      year: 3,
      guardianName: 'Dinesh Patel',
      guardianPhone: '+91 98222 33445',
    });

    const student3 = await Student.create({
      user: studentUser3._id,
      rollNumber: 'EC202405',
      admissionNumber: 'ADM-9035',
      room: room102._id,
      course: 'B.Tech Electronics & Communication',
      year: 2,
      guardianName: 'Sanjay Verma',
      guardianPhone: '+91 98333 44556',
    });

    const student4 = await Student.create({
      user: studentUser4._id,
      rollNumber: 'ME202410',
      admissionNumber: 'ADM-9060',
      room: room201._id,
      course: 'B.Tech Mechanical Engineering',
      year: 4,
      guardianName: 'Nagesh Rao',
      guardianPhone: '+91 98444 55667',
    });

    const student5 = await Student.create({
      user: studentUser5._id,
      rollNumber: 'CE202412',
      admissionNumber: 'ADM-9072',
      room: room202._id,
      course: 'B.Tech Civil Engineering',
      year: 2,
      guardianName: 'Balwant Singh',
      guardianPhone: '+91 98555 66778',
    });

    console.log('[Seed] Created 5 Student profiles.');

    // 5. Create ESP32 Devices & pair to rooms
    const dev1 = await Device.create({
      deviceId: 'ESP32_R101',
      name: 'Room 101 Smart Energy Node',
      macAddress: '24:6F:28:A1:01:01',
      room: room101._id,
      status: 'online',
      lastSeen: new Date(),
      lastVoltage: 231.4,
      lastCurrent: 2.85,
      lastPowerKw: 0.627,
      lastPowerFactor: 0.95,
      cumulativeKwh: 142.8,
      ipAddress: '192.168.1.101',
      firmwareVersion: 'v2.1.0-esp32',
    });

    const dev2 = await Device.create({
      deviceId: 'ESP32_R102',
      name: 'Room 102 Smart Energy Node',
      macAddress: '24:6F:28:A1:01:02',
      room: room102._id,
      status: 'online',
      lastSeen: new Date(),
      lastVoltage: 232.0,
      lastCurrent: 1.15,
      lastPowerKw: 0.253,
      lastPowerFactor: 0.95,
      cumulativeKwh: 86.4,
      ipAddress: '192.168.1.102',
      firmwareVersion: 'v2.1.0-esp32',
    });

    const dev3 = await Device.create({
      deviceId: 'ESP32_R103',
      name: 'Room 103 Smart Energy Node',
      macAddress: '24:6F:28:A1:01:03',
      room: room103._id,
      status: 'online',
      lastSeen: new Date(),
      lastVoltage: 230.8,
      lastCurrent: 0.05,
      lastPowerKw: 0.011,
      lastPowerFactor: 0.98,
      cumulativeKwh: 12.3,
      ipAddress: '192.168.1.103',
      firmwareVersion: 'v2.1.0-esp32',
    });

    const dev4 = await Device.create({
      deviceId: 'ESP32_R201',
      name: 'Room 201 Smart Energy Node',
      macAddress: '24:6F:28:B2:02:01',
      room: room201._id,
      status: 'online',
      lastSeen: new Date(),
      lastVoltage: 229.5,
      lastCurrent: 3.40,
      lastPowerKw: 0.735,
      lastPowerFactor: 0.94,
      cumulativeKwh: 188.2,
      ipAddress: '192.168.1.201',
      firmwareVersion: 'v2.1.0-esp32',
    });

    const dev5 = await Device.create({
      deviceId: 'ESP32_R202',
      name: 'Room 202 Smart Energy Node',
      macAddress: '24:6F:28:B2:02:02',
      room: room202._id,
      status: 'online',
      lastSeen: new Date(),
      lastVoltage: 231.8,
      lastCurrent: 2.10,
      lastPowerKw: 0.463,
      lastPowerFactor: 0.95,
      cumulativeKwh: 115.6,
      ipAddress: '192.168.1.202',
      firmwareVersion: 'v2.1.0-esp32',
    });

    const dev6 = await Device.create({
      deviceId: 'ESP32_R203',
      name: 'Room 203 Smart Energy Node',
      macAddress: '24:6F:28:B2:02:03',
      room: room203._id,
      status: 'offline',
      lastSeen: new Date(Date.now() - 3600000), // 1 hour ago
      lastVoltage: 0,
      lastCurrent: 0,
      lastPowerKw: 0,
      lastPowerFactor: 0.95,
      cumulativeKwh: 5.1,
      ipAddress: '192.168.1.203',
      firmwareVersion: 'v2.1.0-esp32',
    });

    // Link devices back to rooms
    room101.assignedDevice = dev1._id; await room101.save();
    room102.assignedDevice = dev2._id; await room102.save();
    room103.assignedDevice = dev3._id; await room103.save();
    room201.assignedDevice = dev4._id; await room201.save();
    room202.assignedDevice = dev5._id; await room202.save();
    room203.assignedDevice = dev6._id; await room203.save();

    console.log('[Seed] Created and assigned 6 ESP32 smart meters.');

    // 6. Generate 24 hours of sample EnergyReadings for Room 101, 102, 201
    const readings = [];
    const now = Date.now();
    for (let h = 24; h >= 0; h--) {
      const time = new Date(now - h * 3600 * 1000);
      const hour = time.getHours();

      // Room 101 reading
      const r101Power = hour >= 18 && hour <= 23 ? 0.95 : (hour >= 1 && hour <= 6 ? 0.18 : 0.45);
      readings.push({
        device: dev1._id,
        room: room101._id,
        timestamp: time,
        voltage: 231.2 + (Math.random() * 2 - 1),
        current: Number(((r101Power * 1000) / (231 * 0.95)).toFixed(2)),
        powerKw: r101Power,
        powerFactor: 0.95,
        energyKwh: Number((130.0 + (24 - h) * 0.5).toFixed(2)),
        frequency: 50.0,
      });

      // Room 102 reading
      const r102Power = hour >= 20 ? 0.55 : 0.22;
      readings.push({
        device: dev2._id,
        room: room102._id,
        timestamp: time,
        voltage: 232.0,
        current: Number(((r102Power * 1000) / (232 * 0.95)).toFixed(2)),
        powerKw: r102Power,
        powerFactor: 0.95,
        energyKwh: Number((75.0 + (24 - h) * 0.3).toFixed(2)),
        frequency: 50.0,
      });
    }
    await EnergyReading.insertMany(readings);
    console.log(`[Seed] Seeded ${readings.length} historical energy readings.`);

    // 7. Seed Past & Current Bills
    const bill1 = await Bill.create({
      billNumber: 'HW-202610-R101-5821',
      room: room101._id,
      student: student1._id,
      billingMonth: 10,
      billingYear: 2026,
      startDate: new Date(2026, 9, 1),
      endDate: new Date(2026, 9, 31),
      previousReadingKwh: 45.0,
      currentReadingKwh: 125.0,
      unitsConsumedKwh: 80.0,
      tariffPerUnit: 8.50,
      energyCharge: 680.00,
      fixedCharge: 50.00,
      taxAmount: 36.50,
      totalAmount: 766.50,
      status: 'paid',
      dueDate: new Date(2026, 10, 15),
      paidAt: new Date(2026, 10, 10),
      paymentMethod: 'UPI (Google Pay)',
      transactionId: 'UPI-TXN-982736192',
    });

    const bill2 = await Bill.create({
      billNumber: 'HW-202611-R101-9214',
      room: room101._id,
      student: student1._id,
      billingMonth: 11,
      billingYear: 2026,
      startDate: new Date(2026, 10, 1),
      endDate: new Date(2026, 10, 30),
      previousReadingKwh: 125.0,
      currentReadingKwh: 142.8,
      unitsConsumedKwh: 17.8,
      tariffPerUnit: 8.50,
      energyCharge: 151.30,
      fixedCharge: 50.00,
      taxAmount: 10.07,
      totalAmount: 211.37,
      status: 'unpaid',
      dueDate: new Date(2026, 11, 15),
    });

    const bill3 = await Bill.create({
      billNumber: 'HW-202610-R102-3841',
      room: room102._id,
      student: student3._id,
      billingMonth: 10,
      billingYear: 2026,
      startDate: new Date(2026, 9, 1),
      endDate: new Date(2026, 9, 31),
      previousReadingKwh: 30.0,
      currentReadingKwh: 75.0,
      unitsConsumedKwh: 45.0,
      tariffPerUnit: 8.50,
      energyCharge: 382.50,
      fixedCharge: 50.00,
      taxAmount: 21.63,
      totalAmount: 454.13,
      status: 'paid',
      dueDate: new Date(2026, 10, 15),
      paidAt: new Date(2026, 10, 12),
      paymentMethod: 'Net Banking (HDFC)',
      transactionId: 'HDFC-882736152',
    });

    const bill4 = await Bill.create({
      billNumber: 'HW-202610-R201-7729',
      room: room201._id,
      student: student4._id,
      billingMonth: 10,
      billingYear: 2026,
      startDate: new Date(2026, 9, 1),
      endDate: new Date(2026, 9, 31),
      previousReadingKwh: 60.0,
      currentReadingKwh: 165.0,
      unitsConsumedKwh: 105.0,
      tariffPerUnit: 8.50,
      energyCharge: 892.50,
      fixedCharge: 50.00,
      taxAmount: 47.13,
      totalAmount: 989.63,
      status: 'overdue',
      dueDate: new Date(2026, 10, 10),
    });

    console.log('[Seed] Created sample electricity bills with Paid/Unpaid/Overdue statuses.');

    // 8. Seed Notifications & Alerts
    await Notification.create([
      {
        title: 'Safety Advisory: High Consumption Appliances',
        message: 'High-wattage induction heaters and electric kettles above 1500W must be unplugged when unattended to prevent wiring overloads.',
        type: 'info',
        severity: 'info',
        targetRole: 'all',
      },
      {
        title: 'November 2026 Electricity Billing Cycle Active',
        message: 'The billing cycle for November 2026 is currently tracking live kWh units. Final invoices will be compiled on month end.',
        type: 'bill',
        severity: 'info',
        targetRole: 'all',
      },
      {
        title: 'IoT Meter Heartbeat Alert: Room 203',
        message: 'ESP32 Smart Meter ESP32_R203 in Room 203 has timed out. Technician ticket has been logged.',
        type: 'device',
        severity: 'warning',
        targetRole: 'admin',
        device: dev6._id,
        room: room203._id,
      },
    ]);
    console.log('[Seed] Created initial notifications and alerts.');

    console.log('===========================================================');
    console.log('✅ DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('Demo Credentials:');
    console.log('   Admin:      admin@hostelwatt.com    / admin123');
    console.log('   Management: manager@hostelwatt.com  / manager123');
    console.log('   Student:    rahul@hostelwatt.com    / student123 (Room 101)');
    console.log('   Student 2:  priya@hostelwatt.com    / student123 (Room 102)');
    console.log('===========================================================');

    if (shouldConnect) {
      await disconnectDB();
      process.exit(0);
    }
  } catch (err) {
    console.error('[Seed] Error during seeding:', err);
    if (shouldConnect) {
      process.exit(1);
    }
  }
};

if (require.main === module) {
  seedData(true);
}

module.exports = { seedData };
