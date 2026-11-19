const express = require('express');
const router = express.Router();
const {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent,
  getStudentDashboard,
} = require('../controllers/studentController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/me/dashboard', protect, authorize('student', 'admin'), getStudentDashboard);

router.route('/')
  .get(protect, authorize('admin', 'management'), getStudents)
  .post(protect, authorize('admin', 'management'), createStudent);

router.route('/:id')
  .get(protect, getStudentById)
  .put(protect, authorize('admin', 'management'), updateStudent)
  .delete(protect, authorize('admin'), deleteStudent);

module.exports = router;
