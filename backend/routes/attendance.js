const express = require('express');
const Attendance = require('../models/Attendance');
const Session = require('../models/Session');
const Course = require('../models/Course');
const { authenticate, authorize } = require('../middleware/auth');
const { validateObjectId, validatePagination } = require('../middleware/validation');
const { verifySessionIp, extractClientIp } = require('../middleware/ipVerification');

const router = express.Router();

// @route   POST /api/attendance/:sessionId
// @desc    Mark attendance for a session
// @access  Private (Student only)
router.post('/:sessionId', authenticate, authorize('student'), extractClientIp, verifySessionIp, validateObjectId('sessionId'), async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { location, notes } = req.body;
    const studentId = req.user._id;

    // Get session details
    const session = await Session.findById(sessionId)
      .populate('course');

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Check if session is active and within attendance window
    const now = new Date();
    
    if (session.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: 'Session is not currently active'
      });
    }

    if (now < session.attendanceWindowStart || now > session.attendanceWindowEnd) {
      return res.status(400).json({
        success: false,
        message: 'Attendance window is closed'
      });
    }

    // Check if student is enrolled in the course
    const isEnrolled = session.course.students.some(student => 
      student.equals(studentId)
    );

    if (!isEnrolled) {
      return res.status(403).json({
        success: false,
        message: 'You are not enrolled in this course'
      });
    }

    // Check if attendance already marked
    const existingAttendance = await Attendance.findOne({
      session: sessionId,
      student: studentId
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: 'Attendance already marked for this session',
        data: {
          markedAt: existingAttendance.markedAt,
          status: existingAttendance.status
        }
      });
    }

    // Extract device info from request
    const userAgent = req.get('User-Agent') || '';
    const deviceInfo = {
      userAgent,
      platform: req.get('sec-ch-ua-platform') || 'Unknown',
      browser: userAgent.split(' ')[0] || 'Unknown'
    };

    // Create attendance record
    const attendance = new Attendance({
      session: sessionId,
      student: studentId,
      course: session.course._id,
      markedAt: now,
      studentIp: req.clientIp,
      location: location || session.location,
      deviceInfo,
      notes: notes || '',
      verificationMethod: 'ip'
    });

    await attendance.save();

    // Update session attendance count
    await Session.findByIdAndUpdate(sessionId, {
      $inc: { attendanceCount: 1 }
    });

    // Populate the response
    await attendance.populate([
      { path: 'session', select: 'title startTime endTime' },
      { path: 'course', select: 'name code' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Attendance marked successfully',
      data: {
        attendance: {
          _id: attendance._id,
          markedAt: attendance.markedAt,
          status: attendance.status,
          isLate: attendance.isLate,
          minutesLate: attendance.minutesLate,
          location: attendance.location,
          session: attendance.session,
          course: attendance.course
        }
      }
    });
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error marking attendance'
    });
  }
});

// @route   GET /api/attendance/my
// @desc    Get current user's attendance records
// @access  Private (Student only)
router.get('/my', authenticate, authorize('student'), validatePagination, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      courseId,
      startDate,
      endDate,
      status
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter
    let filter = { student: req.user._id };

    if (courseId) filter.course = courseId;
    if (status) filter.status = status;

    // Date range filtering
    if (startDate || endDate) {
      filter.markedAt = {};
      if (startDate) filter.markedAt.$gte = new Date(startDate);
      if (endDate) filter.markedAt.$lte = new Date(endDate);
    }

    const attendance = await Attendance.find(filter)
      .populate([
        { path: 'session', select: 'title startTime endTime sessionType' },
        { path: 'course', select: 'name code' }
      ])
      .sort({ markedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalRecords = await Attendance.countDocuments(filter);

    // Get attendance statistics
    const stats = await Attendance.getAttendanceStats(filter);

    res.json({
      success: true,
      data: {
        attendance,
        stats,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalRecords / parseInt(limit)),
          totalRecords,
          hasNext: skip + attendance.length < totalRecords,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Get my attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving attendance records'
    });
  }
});

// @route   GET /api/attendance/course/:courseId
// @desc    Get attendance records for a course
// @access  Private (Lecturer/Admin only)
router.get('/course/:courseId', authenticate, authorize('lecturer', 'admin'), validateObjectId('courseId'), validatePagination, async (req, res) => {
  try {
    const { courseId } = req.params;
    const {
      page = 1,
      limit = 10,
      sessionId,
      studentId,
      startDate,
      endDate,
      status
    } = req.query;

    // Verify course access
    if (req.user.role === 'lecturer') {
      const course = await Course.findById(courseId);
      if (!course || !course.lecturer.equals(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter
    let filter = { course: courseId };

    if (sessionId) filter.session = sessionId;
    if (studentId) filter.student = studentId;
    if (status) filter.status = status;

    // Date range filtering
    if (startDate || endDate) {
      filter.markedAt = {};
      if (startDate) filter.markedAt.$gte = new Date(startDate);
      if (endDate) filter.markedAt.$lte = new Date(endDate);
    }

    const attendance = await Attendance.find(filter)
      .populate([
        { path: 'session', select: 'title startTime endTime sessionType' },
        { path: 'student', select: 'firstName lastName registrationNumber email' },
        { path: 'course', select: 'name code' }
      ])
      .sort({ markedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalRecords = await Attendance.countDocuments(filter);

    // Get course statistics
    const courseStats = await Attendance.getAttendanceStats(filter);

    res.json({
      success: true,
      data: {
        attendance,
        stats: courseStats,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalRecords / parseInt(limit)),
          totalRecords,
          hasNext: skip + attendance.length < totalRecords,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Get course attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving course attendance'
    });
  }
});

// @route   PUT /api/attendance/:id
// @desc    Update attendance record (manual override)
// @access  Private (Lecturer/Admin only)
router.put('/:id', authenticate, authorize('lecturer', 'admin'), validateObjectId('id'), async (req, res) => {
  try {
    const { status, notes } = req.body;

    const attendance = await Attendance.findById(req.params.id)
      .populate('session');

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    // Check permissions for lecturers
    if (req.user.role === 'lecturer') {
      if (!attendance.session.lecturer.equals(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    // Update allowed fields
    if (status && ['present', 'late', 'excused'].includes(status)) {
      attendance.status = status;
      attendance.verificationMethod = 'manual';
    }

    if (notes !== undefined) {
      attendance.notes = notes;
    }

    await attendance.save();

    await attendance.populate([
      { path: 'session', select: 'title startTime endTime' },
      { path: 'student', select: 'firstName lastName registrationNumber' },
      { path: 'course', select: 'name code' }
    ]);

    res.json({
      success: true,
      message: 'Attendance record updated successfully',
      data: {
        attendance
      }
    });
  } catch (error) {
    console.error('Update attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating attendance record'
    });
  }
});

// @route   DELETE /api/attendance/:id
// @desc    Delete attendance record
// @access  Private (Admin only)
router.delete('/:id', authenticate, authorize('admin'), validateObjectId('id'), async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id);

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Attendance record not found'
      });
    }

    await Attendance.findByIdAndDelete(req.params.id);

    // Update session attendance count
    await Session.findByIdAndUpdate(attendance.session, {
      $inc: { attendanceCount: -1 }
    });

    res.json({
      success: true,
      message: 'Attendance record deleted successfully'
    });
  } catch (error) {
    console.error('Delete attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting attendance record'
    });
  }
});

// @route   GET /api/attendance/student/:studentId
// @desc    Get attendance records for a specific student
// @access  Private (Lecturer/Admin only)
router.get('/student/:studentId', authenticate, authorize('lecturer', 'admin'), validateObjectId('studentId'), validatePagination, async (req, res) => {
  try {
    const { studentId } = req.params;
    const {
      page = 1,
      limit = 10,
      courseId,
      startDate,
      endDate
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter
    let filter = { student: studentId };

    // For lecturers, only show attendance for courses they teach
    if (req.user.role === 'lecturer') {
      const lecturerCourses = await Course.find({ lecturer: req.user._id }).select('_id');
      const courseIds = lecturerCourses.map(course => course._id);
      filter.course = { $in: courseIds };
    }

    if (courseId) filter.course = courseId;

    // Date range filtering
    if (startDate || endDate) {
      filter.markedAt = {};
      if (startDate) filter.markedAt.$gte = new Date(startDate);
      if (endDate) filter.markedAt.$lte = new Date(endDate);
    }

    const attendance = await Attendance.find(filter)
      .populate([
        { path: 'session', select: 'title startTime endTime sessionType' },
        { path: 'course', select: 'name code' },
        { path: 'student', select: 'firstName lastName registrationNumber email' }
      ])
      .sort({ markedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalRecords = await Attendance.countDocuments(filter);

    // Get student statistics
    const stats = await Attendance.getAttendanceStats(filter);

    res.json({
      success: true,
      data: {
        attendance,
        stats,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalRecords / parseInt(limit)),
          totalRecords,
          hasNext: skip + attendance.length < totalRecords,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Get student attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving student attendance'
    });
  }
});

// @route   GET /api/attendance/check/:sessionId
// @desc    Check if student can mark attendance (for real-time status)
// @access  Private (Student only)
router.get('/check/:sessionId', authenticate, authorize('student'), validateObjectId('sessionId'), async (req, res) => {
  try {
    const { sessionId } = req.params;
    const studentId = req.user._id;

    const session = await Session.findById(sessionId)
      .populate('course', 'students');

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    const now = new Date();
    
    // Check enrollment
    const isEnrolled = session.course.students.some(student => 
      student.equals(studentId)
    );

    // Check if already marked
    const existingAttendance = await Attendance.findOne({
      session: sessionId,
      student: studentId
    });

    const canMark = isEnrolled && 
                   session.status === 'active' && 
                   now >= session.attendanceWindowStart && 
                   now <= session.attendanceWindowEnd &&
                   !existingAttendance;

    const response = {
      success: true,
      data: {
        canMarkAttendance: canMark,
        session: {
          _id: session._id,
          title: session.title,
          status: session.status,
          attendanceWindowStart: session.attendanceWindowStart,
          attendanceWindowEnd: session.attendanceWindowEnd,
          isCurrentlyActive: session.isCurrentlyActive,
          hasExpired: session.hasExpired
        },
        isEnrolled,
        alreadyMarked: !!existingAttendance,
        timeRemaining: session.attendanceWindowEnd - now,
        reasons: []
      }
    };

    // Add reasons why attendance cannot be marked
    if (!canMark) {
      if (!isEnrolled) response.data.reasons.push('Not enrolled in course');
      if (session.status !== 'active') response.data.reasons.push(`Session is ${session.status}`);
      if (now < session.attendanceWindowStart) response.data.reasons.push('Attendance window not yet open');
      if (now > session.attendanceWindowEnd) response.data.reasons.push('Attendance window closed');
      if (existingAttendance) response.data.reasons.push('Attendance already marked');
    }

    res.json(response);
  } catch (error) {
    console.error('Check attendance eligibility error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error checking attendance eligibility'
    });
  }
});

module.exports = router;
