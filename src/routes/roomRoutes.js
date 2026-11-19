const express = require('express');
const router = express.Router();
const {
  getRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
} = require('../controllers/roomController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.route('/')
  .get(protect, getRooms)
  .post(protect, authorize('admin', 'management'), createRoom);

router.route('/:id')
  .get(protect, getRoomById)
  .put(protect, authorize('admin', 'management'), updateRoom)
  .delete(protect, authorize('admin'), deleteRoom);

module.exports = router;
