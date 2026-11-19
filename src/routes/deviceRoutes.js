const express = require('express');
const router = express.Router();
const {
  getDevices,
  getDeviceById,
  createDevice,
  updateDevice,
  deleteDevice,
  toggleSimulator,
  getSimulatorInfo,
  triggerSurge,
} = require('../controllers/deviceController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/simulator/status', getSimulatorInfo);
router.post('/simulator/toggle', protect, authorize('admin', 'management'), toggleSimulator);
router.post('/simulator/trigger-surge', protect, authorize('admin', 'management'), triggerSurge);

router.route('/')
  .get(protect, authorize('admin', 'management'), getDevices)
  .post(protect, authorize('admin'), createDevice);

router.route('/:id')
  .get(protect, authorize('admin', 'management'), getDeviceById)
  .put(protect, authorize('admin'), updateDevice)
  .delete(protect, authorize('admin'), deleteDevice);

module.exports = router;
