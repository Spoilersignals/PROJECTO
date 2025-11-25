const express = require('express');
const Session = require('../models/Session');
const Course = require('../models/Course');
const Attendance = require('../models/Attendance');
const { authenticate, authorize } = require('../middleware/auth');
const { validateSessionCreation, validateObjectId, validatePagination } = require('../middleware/validation');
const { extractClientIp } = require('../middleware/ipVerification');

const router = express.Router();

// @route   POST /api/sessions/simple
// @desc    Create a simple session without course dependency
// @access  Private (Lecturer only)
router.post('/simple', authenticate, authorize('lecturer', 'admin'), extractClientIp, async (req, res) => {
  try {
    const {
      courseCode,
      courseName,
      sessionName,
      wifiSSID,
      latitude,
      longitude,
      allowedRadius,
      expiresAt,
      isActive
    } = req.body;

    if (!courseCode || !courseName || !sessionName) {
      return res.status(400).json({
        success: false,
        message: 'Course code, course name, and session name are required'
      });
    }

    // Generate allowed IP range based on lecturer's current IP
    // This ensures students must be on the same network as the lecturer
    const lecturerIp = req.clientIp || '127.0.0.1';
    const allowedIpRanges = [lecturerIp];
    
    // If lecturer is on a local network, allow the subnet
    if (lecturerIp.startsWith('192.168.') || lecturerIp.startsWith('10.')) {
      const ipParts = lecturerIp.split('.');
      const subnet = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}.0/24`;
      allowedIpRanges.push(subnet);
    }
    
    console.log(`[SESSION CREATION] Lecturer IP: ${lecturerIp}`);
    console.log(`[SESSION CREATION] Allowed IP ranges: ${JSON.stringify(allowedIpRanges)}`);
    console.log(`[SESSION CREATION] Required WiFi SSID: ${wifiSSID}`);
    console.log(`[SESSION CREATION] WARNING: All IPs in subnet ${allowedIpRanges[1] || allowedIpRanges[0]} can mark attendance!`);

    const session = new Session({
      courseCode,
      courseName,
      title: sessionName,
      sessionType: 'lecture',
      lecturer: req.user._id,
      location: { latitude, longitude },
      wifiSSID,
      allowedRadius: allowedRadius || 50,
      allowedIpRanges,
      status: isActive ? 'active' : 'scheduled',
      startTime: new Date(),
      endTime: new Date(expiresAt || Date.now() + 2 * 60 * 60 * 1000),
      attendanceWindowStart: new Date(),
      attendanceWindowEnd: new Date(expiresAt || Date.now() + 2 * 60 * 60 * 1000),
      metadata: {
        createdByIp: req.clientIp
      }
    });

    await session.save();

    res.status(201).json({
      success: true,
      message: 'Session created successfully',
      data: {
        session
      }
    });
  } catch (error) {
    console.error('Create simple session error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating session'
    });
  }
});

// @route   POST /api/sessions
// @desc    Create a new session
// @access  Private (Lecturer only)
router.post('/', authenticate, authorize('lecturer', 'admin'), extractClientIp, validateSessionCreation, async (req, res) => {
  try {
    const {
      courseId,
      title,
      description,
      sessionType,
      location,
      startTime,
      endTime,
      attendanceWindowStart,
      attendanceWindowEnd,
      allowedIpRanges,
      settings
    } = req.body;

    // Verify course exists and user has access
    const course = await Course.findById(courseId).populate('students');
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if user is the lecturer of this course (or admin)
    if (req.user.role !== 'admin' && !course.lecturer.equals(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You can only create sessions for courses you teach'
      });
    }

    // Check for overlapping sessions
    const overlappingSession = await Session.findOne({
      course: courseId,
      $or: [
        {
          startTime: { $lte: new Date(endTime) },
          endTime: { $gte: new Date(startTime) }
        }
      ],
      status: { $ne: 'cancelled' }
    });

    if (overlappingSession) {
      return res.status(400).json({
        success: false,
        message: 'A session already exists during this time period'
      });
    }

    // Create session
    const session = new Session({
      course: courseId,
      lecturer: req.user._id,
      title,
      description,
      sessionType,
      location,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      attendanceWindowStart: new Date(attendanceWindowStart),
      attendanceWindowEnd: new Date(attendanceWindowEnd),
      allowedIpRanges,
      totalStudents: course.students.length,
      settings: settings || {},
      metadata: {
        createdByIp: req.clientIp
      }
    });

    await session.save();

    // Populate response data
    await session.populate([
      { path: 'course', select: 'name code' },
      { path: 'lecturer', select: 'firstName lastName' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Session created successfully',
      data: {
        session
      }
    });
  } catch (error) {
    console.error('Create session error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating session'
    });
  }
});

// @route   GET /api/sessions
// @desc    Get sessions with filtering and pagination
// @access  Private
router.post('/visible', authenticate, extractClientIp, async (req, res) => {
  // New endpoint specifically for "Visible" sessions based on IP
  try {
    const clientIp = req.clientIp;
    const ipRangeCheck = require('ip-range-check');

    // Find all active sessions
    const activeSessions = await Session.find({
      status: 'active',
      attendanceWindowEnd: { $gte: new Date() }
    }).populate([
      { path: 'course', select: 'name code' },
      { path: 'lecturer', select: 'firstName lastName' }
    ]);

    // Filter by IP
    const visibleSessions = activeSessions.filter(session => {
      if (!session.allowedIpRanges || session.allowedIpRanges.length === 0) return true;
      
      return session.allowedIpRanges.some(range => {
         try {
           return ipRangeCheck(clientIp, range);
         } catch (e) {
           return false;
         }
      });
    });

    res.json({
      success: true,
      data: {
        sessions: visibleSessions,
        clientIp
      }
    });
  } catch (error) {
    console.error('Get visible sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving sessions'
    });
  }
});

// @route   GET /api/sessions
// @desc    Get sessions with filtering and pagination
// @access  Private
router.get('/', authenticate, validatePagination, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      courseId,
      status,
      sessionType,
      startDate,
      endDate,
      lecturerId
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter
    let filter = {};

    // Role-based filtering
    if (req.user.role === 'lecturer') {
      filter.lecturer = req.user._id;
    } else if (req.user.role === 'student') {
      // Students should only see active sessions that haven't expired
      filter.status = 'active';
      filter.attendanceWindowEnd = { $gte: new Date() };
      // If you want to restrict to enrolled courses only, uncomment below:
      // const enrolledCourses = req.user.courses;
      // filter.course = { $in: enrolledCourses };
    }

    // Additional filters
    if (courseId) filter.course = courseId;
    if (status) filter.status = status;
    if (sessionType) filter.sessionType = sessionType;
    if (lecturerId && req.user.role === 'admin') filter.lecturer = lecturerId;

    // Date range filtering
    if (startDate || endDate) {
      filter.startTime = {};
      if (startDate) filter.startTime.$gte = new Date(startDate);
      if (endDate) filter.startTime.$lte = new Date(endDate);
    }

    const sessions = await Session.find(filter)
      .populate([
        { path: 'course', select: 'name code' },
        { path: 'lecturer', select: 'firstName lastName' }
      ])
      .sort({ startTime: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalSessions = await Session.countDocuments(filter);

    res.json({
      success: true,
      data: {
        sessions,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalSessions / parseInt(limit)),
          totalSessions,
          hasNext: skip + sessions.length < totalSessions,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving sessions'
    });
  }
});

// @route   GET /api/sessions/:id
// @desc    Get single session by ID
// @access  Private
router.get('/:id', authenticate, validateObjectId('id'), async (req, res) => {
  try {
    const session = await Session.findById(req.params.id)
      .populate([
        { path: 'course', select: 'name code description' },
        { path: 'lecturer', select: 'firstName lastName email' }
      ]);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Check access permissions
    if (req.user.role === 'student') {
      const hasAccess = req.user.courses.some(courseId => 
        courseId.equals(session.course._id)
      );
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    } else if (req.user.role === 'lecturer') {
      if (!session.lecturer._id.equals(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    // Get attendance statistics if lecturer or admin
    let attendanceStats = null;
    if (req.user.role === 'lecturer' || req.user.role === 'admin') {
      const attendanceCount = await Attendance.countDocuments({ session: session._id });
      attendanceStats = {
        totalAttendance: attendanceCount,
        attendanceRate: session.totalStudents > 0 
          ? ((attendanceCount / session.totalStudents) * 100).toFixed(2) 
          : 0
      };
    }

    res.json({
      success: true,
      data: {
        session,
        attendanceStats
      }
    });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving session'
    });
  }
});

// @route   PUT /api/sessions/:id
// @desc    Update session
// @access  Private (Lecturer/Admin only)
router.put('/:id', authenticate, authorize('lecturer', 'admin'), extractClientIp, validateObjectId('id'), async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Check permissions
    if (req.user.role === 'lecturer' && !session.lecturer.equals(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You can only update sessions you created'
      });
    }

    // Don't allow updating ended sessions
    if (session.status === 'ended') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update ended sessions'
      });
    }

    // Update allowed fields
    const allowedUpdates = [
      'title', 'description', 'location', 'startTime', 'endTime',
      'attendanceWindowStart', 'attendanceWindowEnd', 'allowedIpRanges', 'settings'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field.includes('Time')) {
          session[field] = new Date(req.body[field]);
        } else {
          session[field] = req.body[field];
        }
      }
    });

    session.metadata.lastModifiedByIp = req.clientIp;
    
    await session.save();

    await session.populate([
      { path: 'course', select: 'name code' },
      { path: 'lecturer', select: 'firstName lastName' }
    ]);

    res.json({
      success: true,
      message: 'Session updated successfully',
      data: {
        session
      }
    });
  } catch (error) {
    console.error('Update session error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating session'
    });
  }
});

// @route   POST /api/sessions/:id/activate
// @desc    Activate a session
// @access  Private (Lecturer only)
router.post('/:id/activate', authenticate, authorize('lecturer', 'admin'), validateObjectId('id'), async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    if (req.user.role === 'lecturer' && !session.lecturer.equals(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    session.status = 'active';
    await session.save();

    res.json({
      success: true,
      message: 'Session activated successfully',
      data: { session }
    });
  } catch (error) {
    console.error('Activate session error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error activating session'
    });
  }
});

// @route   POST /api/sessions/:id/deactivate
// @desc    Deactivate a session
// @access  Private (Lecturer only)
router.post('/:id/deactivate', authenticate, authorize('lecturer', 'admin'), validateObjectId('id'), async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    if (req.user.role === 'lecturer' && !session.lecturer.equals(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    session.status = 'scheduled';
    await session.save();

    res.json({
      success: true,
      message: 'Session deactivated successfully',
      data: { session }
    });
  } catch (error) {
    console.error('Deactivate session error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deactivating session'
    });
  }
});

// @route   POST /api/sessions/:id/start
// @desc    Start a session
// @access  Private (Lecturer only)
router.post('/:id/start', authenticate, authorize('lecturer', 'admin'), validateObjectId('id'), async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Check permissions
    if (req.user.role === 'lecturer' && !session.lecturer.equals(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (session.status !== 'scheduled') {
      return res.status(400).json({
        success: false,
        message: 'Session is not in scheduled status'
      });
    }

    session.status = 'active';
    await session.save();

    res.json({
      success: true,
      message: 'Session started successfully',
      data: {
        session
      }
    });
  } catch (error) {
    console.error('Start session error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error starting session'
    });
  }
});

// @route   POST /api/sessions/:id/end
// @desc    End a session
// @access  Private (Lecturer only)
router.post('/:id/end', authenticate, authorize('lecturer', 'admin'), validateObjectId('id'), async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Check permissions
    if (req.user.role === 'lecturer' && !session.lecturer.equals(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (session.status === 'ended' || session.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: `Session is already ${session.status}`
      });
    }

    // Update attendance count
    const attendanceCount = await Attendance.countDocuments({ session: session._id });
    session.attendanceCount = attendanceCount;
    session.status = 'ended';
    
    await session.save();

    res.json({
      success: true,
      message: 'Session ended successfully',
      data: {
        session,
        finalAttendanceCount: attendanceCount
      }
    });
  } catch (error) {
    console.error('End session error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error ending session'
    });
  }
});

// @route   DELETE /api/sessions/:id
// @desc    Cancel/Delete session
// @access  Private (Lecturer/Admin only)
router.delete('/:id', authenticate, authorize('lecturer', 'admin'), validateObjectId('id'), async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Check permissions
    if (req.user.role === 'lecturer' && !session.lecturer.equals(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // If session has attendance records, mark as cancelled instead of deleting
    const hasAttendance = await Attendance.countDocuments({ session: session._id }) > 0;

    if (hasAttendance) {
      session.status = 'cancelled';
      await session.save();
      
      res.json({
        success: true,
        message: 'Session cancelled successfully (attendance records preserved)',
        data: { session }
      });
    } else {
      await Session.findByIdAndDelete(req.params.id);
      
      res.json({
        success: true,
        message: 'Session deleted successfully'
      });
    }
  } catch (error) {
    console.error('Delete session error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting session'
    });
  }
});

// @route   GET /api/sessions/:id/attendance
// @desc    Get attendance records for a session
// @access  Private (Lecturer/Admin only)
router.get('/:id/attendance', authenticate, authorize('lecturer', 'admin'), validateObjectId('id'), async (req, res) => {
  try {
    const session = await Session.findById(req.params.id);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Check permissions
    if (req.user.role === 'lecturer' && !session.lecturer.equals(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const attendance = await Attendance.find({ session: req.params.id })
      .populate('student', 'firstName lastName registrationNumber email')
      .sort({ markedAt: 1 });

    const stats = {
      totalStudents: session.totalStudents,
      presentCount: attendance.length,
      attendanceRate: session.totalStudents > 0 
        ? ((attendance.length / session.totalStudents) * 100).toFixed(2)
        : 0,
      lateCount: attendance.filter(record => record.isLate).length
    };

    res.json({
      success: true,
      data: {
        session: {
          _id: session._id,
          title: session.title,
          startTime: session.startTime,
          endTime: session.endTime
        },
        attendance,
        stats
      }
    });
  } catch (error) {
    console.error('Get session attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving attendance'
    });
  }
});

module.exports = router;
