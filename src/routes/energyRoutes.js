const express = require('express');
const router = express.Router();
const {
  getDashboardSummary,
  getLiveReadings,
  getHistoricalReadings,
  ingestReading,
} = require('../controllers/energyController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/reading', ingestReading); // IoT device ingestion endpoint

router.get('/dashboard-summary', protect, authorize('admin', 'management'), getDashboardSummary);
router.get('/live', protect, getLiveReadings);
router.get('/history', protect, getHistoricalReadings);

module.exports = router;
