const express = require('express');
const router = express.Router();
const { getEnergyReport, getFinancialReport } = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/energy-summary', protect, authorize('admin', 'management'), getEnergyReport);
router.get('/billing-summary', protect, authorize('admin', 'management'), getFinancialReport);

module.exports = router;
