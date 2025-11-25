const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Attendance = require('../models/Attendance');
const Session = require('../models/Session');
const Course = require('../models/Course');
const { authenticate, authorize } = require('../middleware/auth');
const { validateObjectId, validatePagination } = require('../middleware/validation');
const { verifySessionIp, extractClientIp } = require('../middleware/ipVerification');
const { compareFaces } = require('../utils/faceRecognition');
const User = require('../models/User');

const router = express.Router();

// Configure Multer for image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, '../public/uploads/attendance');
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'attendance-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    if (!file.originalname.match(/\.(jpg|jpeg|png|webp)$/)) {
      return cb(new Error('Only image files are allowed!'));
    }
    cb(null, true);
  }
});

// @route   POST /api/attendance/:sessionId
// @desc    Mark attendance for a session
// @access  Private (Student only)
router.post('/:sessionId', authenticate, authorize('student'), extractClientIp, validateObjectId('sessionId'), upload.single('image'), async (req, res) => {
  try {
    const { sessionId } = req.params;
    // Handle both JSON body and FormData fields (multer populates req.body)
    let { location, notes, wifiSSID, deviceId } = req.body;
    
    // Parse location if it came as a string (FormData often sends nested objects as JSON strings)
    if (typeof location === 'string') {
      try {
        location = JSON.parse(location);
      } catch (e) {
        console.error('Failed to parse location JSON:', e);
      }
    }

    const studentId = req.user._id;
    const verificationImage = req.file ? `/uploads/attendance/${req.file.filename}` : null;

    // Get session details
    const session = await Session.findById(sessionId)
      .populate('course');

    // Fetch full user to get profile picture
    const user = await User.findById(studentId);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    // FACE VERIFICATION LOGIC
    if (verificationImage) {
      if (user.profilePicture) {
        const isMatch = await compareFaces(user.profilePicture, verificationImage);
        
        if (!isMatch) {
           // Delete the uploaded file if validation fails
           // fs.unlinkSync(path.join(__dirname, '../public', verificationImage));
           
           return res.status(403).json({
             success: false,
             message: 'Face verification failed. The selfie does not match your profile picture.'
           });
        }
        console.log(`[FACE VERIFICATION] Success for user ${user.email}`);
      } else {
        console.warn(`[FACE VERIFICATION] User ${user.email} has no profile picture. Skipping comparison.`);
      }
    } else if (session.settings?.requireFaceVerification) {
       return res.status(400).json({
         success: false,
         message: 'Face verification is required for this session'
       });
    }

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

    // CRITICAL SECURITY: Verify IP address is within allowed range (prevents remote attendance)
    if (session.allowedIpRanges && session.allowedIpRanges.length > 0) {
      const ipRangeCheck = require('ip-range-check');
      const clientIp = req.clientIp;
      
      console.log(`[IP VERIFICATION] Student IP: ${clientIp}`);
      console.log(`[IP VERIFICATION] Allowed ranges: ${JSON.stringify(session.allowedIpRanges)}`);
      console.log(`[IP VERIFICATION] Required WiFi: ${session.wifiSSID}`);
      console.log(`[IP VERIFICATION] Student reported WiFi: ${wifiSSID || 'not provided'}`);
      
      const isAllowedIp = session.allowedIpRanges.some(range => {
        try {
          const matched = ipRangeCheck(clientIp, range);
          console.log(`[IP VERIFICATION] Checking ${clientIp} against ${range}: ${matched ? 'MATCH' : 'NO MATCH'}`);
          return matched;
        } catch (error) {
          console.error(`[IP VERIFICATION] Invalid IP range: ${range}`, error);
          return false;
        }
      });

      if (!isAllowedIp) {
        console.log(`[IP VERIFICATION] DENIED - IP ${clientIp} not in allowed ranges`);
        return res.status(403).json({
          success: false,
          message: `You must be connected to the classroom network to mark attendance. Please connect to "${session.wifiSSID || 'the classroom WiFi'}" and ensure you are physically present in the classroom.`,
          debug: process.env.NODE_ENV !== 'production' ? {
            yourIP: clientIp,
            allowedRanges: session.allowedIpRanges,
            requiredWiFi: session.wifiSSID
          } : undefined
        });
      }
      
      console.log(`[IP VERIFICATION] SUCCESS - IP ${clientIp} verified`);
    } else {
      console.warn(`[IP VERIFICATION] WARNING - No IP ranges configured for session ${sessionId}. Anyone can mark attendance!`);
    }

    // Verify location if session has location requirements (optional - IP is primary)
    // Note: GPS on mobile networks can be inaccurate, so we make this lenient
    let distance = null;
    if (session.location && session.location.latitude && session.location.longitude && location && location.latitude && location.longitude) {
      // Calculate distance between student and session location (Haversine formula)
      const R = 6371e3; // Earth radius in meters
      const φ1 = session.location.latitude * Math.PI / 180;
      const φ2 = location.latitude * Math.PI / 180;
      const Δφ = (location.latitude - session.location.latitude) * Math.PI / 180;
      const Δλ = (location.longitude - session.location.longitude) * Math.PI / 180;

      const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      distance = R * c; // Distance in meters

      const allowedRadius = session.allowedRadius || 200; // Increased default to 200m for mobile network tolerance
      
      // Only enforce distance if student is connected to WiFi (not mobile data)
      // Mobile data GPS can be very inaccurate (100s of meters off)
      if (distance > allowedRadius && distance < 10000) { // Only warn if less than 10km (beyond that is clearly GPS error)
        console.log(`Student distance: ${Math.round(distance)}m from session location. Allowed: ${allowedRadius}m. IP verified, allowing.`);
        // We allow it because IP verification is more reliable than mobile GPS
      }
    }

    // Check if student is enrolled in the course (only for sessions with course reference)
    if (session.course && session.course.students) {
      const isEnrolled = session.course.students.some(student => 
        student.equals(studentId)
      );

      if (!isEnrolled) {
        return res.status(403).json({
          success: false,
          message: 'You are not enrolled in this course'
        });
      }
    }
    // For simplified sessions (without course reference), allow all students

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

    // SECURITY: Check if this device has already been used to mark attendance for this session
    if (deviceId) {
      const existingDeviceAttendance = await Attendance.findOne({
        session: sessionId,
        deviceId: deviceId
      });
      
      if (existingDeviceAttendance && !existingDeviceAttendance.student.equals(studentId)) {
         console.log(`[DEVICE BLOCKED] Device ${deviceId} already used by student ${existingDeviceAttendance.student} for session ${sessionId}`);
         return res.status(403).json({
            success: false,
            message: 'This device has already been used to mark attendance for this session. Please use your own device.'
         });
      }
    }

    // Extract device info from request
    const userAgent = req.get('User-Agent') || '';
    const deviceInfo = {
      userAgent,
      platform: req.get('sec-ch-ua-platform') || 'Unknown',
      browser: userAgent.split(' ')[0] || 'Unknown'
    };

    // Determine verification method based on what was checked
    let verificationMethod = 'manual';
    if (session.allowedIpRanges && session.allowedIpRanges.length > 0) {
      verificationMethod = 'ip';
    }
    if (session.location && session.location.latitude) {
      verificationMethod = verificationMethod === 'ip' ? 'ip+location' : 'location';
    }

    // Create attendance record
    const attendance = new Attendance({
      session: sessionId,
      student: studentId,
      course: session.course?._id || null,
      courseCode: session.courseCode || session.course?.code || null,
      courseName: session.courseName || session.course?.name || null,
      markedAt: now,
      studentIp: req.clientIp,
      location: location || session.location,
      deviceInfo,
      notes: notes || '',
      verificationMethod,
      verificationImage,
      wifiSSID: wifiSSID || null,
      deviceId: deviceId || null
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
