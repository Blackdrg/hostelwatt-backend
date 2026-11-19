const express = require('express');
const router = express.Router();
const {
  getBills,
  getBillById,
  generateRoomBill,
  generateMonthlyBills,
  updateBillStatus,
  getBillingStats,
  getStudentBills,
} = require('../controllers/billingController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/student/my-bills', protect, getStudentBills);
router.get('/stats', protect, authorize('admin', 'management'), getBillingStats);
router.post('/generate-room', protect, authorize('admin', 'management'), generateRoomBill);
router.post('/generate-all', protect, authorize('admin', 'management'), generateMonthlyBills);

router.route('/')
  .get(protect, getBills);

router.route('/:id')
  .get(protect, getBillById);

router.put('/:id/status', protect, updateBillStatus);

module.exports = router;
