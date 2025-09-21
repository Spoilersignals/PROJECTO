const express = require('express');
const Course = require('../models/Course');
const User = require('../models/User');
const Session = require('../models/Session');
const Attendance = require('../models/Attendance');
const { authenticate, authorize } = require('../middleware/auth');
const { validateCourseCreation, validateObjectId, validatePagination } = require('../middleware/validation');

const router = express.Router();

// @route   POST /api/courses
// @desc    Create new course
// @access  Private (Admin only)
router.post('/', authenticate, authorize('admin'), validateCourseCreation, async (req, res) => {
  try {
    const {
      name,
      code,
      description,
      lecturerId,
      credits,
      semester,
      academicYear,
      schedule
    } = req.body;

    // Check if course with same code exists
    const existingCourse = await Course.findOne({ code: code.toUpperCase() });
    if (existingCourse) {
      return res.status(400).json({
        success: false,
        message: 'Course code already exists'
      });
    }

    // Verify lecturer exists and has correct role
    const lecturer = await User.findById(lecturerId);
    if (!lecturer || lecturer.role !== 'lecturer') {
      return res.status(400).json({
        success: false,
        message: 'Invalid lecturer ID'
      });
    }

    const course = new Course({
      name,
      code: code.toUpperCase(),
      description,
      institution: req.user.institution,
      lecturer: lecturerId,
      credits,
      semester,
      academicYear,
      schedule: schedule || []
    });

    await course.save();

    await course.populate([
      { path: 'lecturer', select: 'firstName lastName email' },
      { path: 'institution', select: 'name code' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: {
        course
      }
    });
  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating course'
    });
  }
});

// @route   GET /api/courses
// @desc    Get courses with filtering and pagination
// @access  Private
router.get('/', authenticate, validatePagination, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      lecturerId,
      search,
      semester,
      academicYear,
      isActive
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter based on user role
    let filter = {};

    if (req.user.role === 'lecturer') {
      filter.lecturer = req.user._id;
    } else if (req.user.role === 'student') {
      filter._id = { $in: req.user.courses };
    } else if (req.user.role === 'admin') {
      // Admins can see all courses, apply optional filters
      if (lecturerId) filter.lecturer = lecturerId;
    }

    // Additional filters
    if (semester) filter.semester = semester;
    if (academicYear) filter.academicYear = academicYear;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    // Search functionality
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }

    const courses = await Course.find(filter)
      .populate([
        { path: 'lecturer', select: 'firstName lastName email' },
        { path: 'institution', select: 'name code' }
      ])
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalCourses = await Course.countDocuments(filter);

    // Add statistics for each course
    const coursesWithStats = await Promise.all(
      courses.map(async (course) => {
        const sessionCount = await Session.countDocuments({ course: course._id });
        const activeSessionCount = await Session.countDocuments({ 
          course: course._id, 
          status: 'active' 
        });

        return {
          ...course.toObject(),
          stats: {
            totalStudents: course.students.length,
            totalSessions: sessionCount,
            activeSessions: activeSessionCount
          }
        };
      })
    );

    res.json({
      success: true,
      data: {
        courses: coursesWithStats,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCourses / parseInt(limit)),
          totalCourses,
          hasNext: skip + courses.length < totalCourses,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving courses'
    });
  }
});

// @route   GET /api/courses/:id
// @desc    Get single course by ID
// @access  Private
router.get('/:id', authenticate, validateObjectId('id'), async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate([
        { path: 'lecturer', select: 'firstName lastName email employeeId' },
        { path: 'institution', select: 'name code' },
        { path: 'students', select: 'firstName lastName email registrationNumber' }
      ]);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check access permissions
    if (req.user.role === 'student') {
      const hasAccess = req.user.courses.some(courseId => 
        courseId.equals(course._id)
      );
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    } else if (req.user.role === 'lecturer') {
      if (!course.lecturer._id.equals(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    // Get course statistics
    const sessionStats = await Session.aggregate([
      { $match: { course: course._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const attendanceStats = await Attendance.aggregate([
      { $match: { course: course._id } },
      {
        $group: {
          _id: null,
          totalAttendance: { $sum: 1 },
          uniqueStudents: { $addToSet: '$student' },
          averageAttendanceRate: { $avg: 100 } // Simplified
        }
      }
    ]);

    const stats = {
      sessions: sessionStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, { scheduled: 0, active: 0, ended: 0, cancelled: 0 }),
      attendance: attendanceStats[0] || {
        totalAttendance: 0,
        uniqueStudents: [],
        averageAttendanceRate: 0
      }
    };

    stats.attendance.uniqueStudentCount = stats.attendance.uniqueStudents.length;
    delete stats.attendance.uniqueStudents;

    res.json({
      success: true,
      data: {
        course,
        stats
      }
    });
  } catch (error) {
    console.error('Get course error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving course'
    });
  }
});

// @route   PUT /api/courses/:id
// @desc    Update course
// @access  Private (Admin/Lecturer only)
router.put('/:id', authenticate, authorize('lecturer', 'admin'), validateObjectId('id'), async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check permissions for lecturers
    if (req.user.role === 'lecturer' && !course.lecturer.equals(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You can only update courses you teach'
      });
    }

    const {
      name,
      description,
      lecturerId,
      credits,
      semester,
      academicYear,
      schedule,
      isActive
    } = req.body;

    // Update allowed fields
    if (name) course.name = name;
    if (description !== undefined) course.description = description;
    if (credits) course.credits = credits;
    if (semester) course.semester = semester;
    if (academicYear) course.academicYear = academicYear;
    if (schedule) course.schedule = schedule;
    if (isActive !== undefined) course.isActive = isActive;

    // Only admins can change lecturer
    if (lecturerId && req.user.role === 'admin') {
      const lecturer = await User.findById(lecturerId);
      if (!lecturer || lecturer.role !== 'lecturer') {
        return res.status(400).json({
          success: false,
          message: 'Invalid lecturer ID'
        });
      }
      course.lecturer = lecturerId;
    }

    await course.save();

    await course.populate([
      { path: 'lecturer', select: 'firstName lastName email' },
      { path: 'institution', select: 'name code' }
    ]);

    res.json({
      success: true,
      message: 'Course updated successfully',
      data: {
        course
      }
    });
  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating course'
    });
  }
});

// @route   DELETE /api/courses/:id
// @desc    Delete course
// @access  Private (Admin only)
router.delete('/:id', authenticate, authorize('admin'), validateObjectId('id'), async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check for associated sessions
    const sessionCount = await Session.countDocuments({ course: req.params.id });
    if (sessionCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete course. It has ${sessionCount} associated sessions.`
      });
    }

    // Remove course from all enrolled students
    await User.updateMany(
      { courses: req.params.id },
      { $pull: { courses: req.params.id } }
    );

    await Course.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Course deleted successfully'
    });
  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting course'
    });
  }
});

// @route   POST /api/courses/:id/enroll
// @desc    Bulk enroll students in course
// @access  Private (Admin/Lecturer only)
router.post('/:id/enroll', authenticate, authorize('lecturer', 'admin'), validateObjectId('id'), async (req, res) => {
  try {
    const { studentIds } = req.body;

    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Student IDs array is required'
      });
    }

    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check permissions for lecturers
    if (req.user.role === 'lecturer' && !course.lecturer.equals(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Verify all student IDs are valid students
    const students = await User.find({
      _id: { $in: studentIds },
      role: 'student',
      isActive: true
    });

    if (students.length !== studentIds.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more invalid student IDs'
      });
    }

    let enrolledCount = 0;
    let alreadyEnrolled = 0;

    for (const student of students) {
      if (!student.courses.includes(course._id)) {
        student.courses.push(course._id);
        await student.save();
        
        if (!course.students.includes(student._id)) {
          course.students.push(student._id);
        }
        
        enrolledCount++;
      } else {
        alreadyEnrolled++;
      }
    }

    await course.save();

    res.json({
      success: true,
      message: `Enrollment completed. ${enrolledCount} students enrolled, ${alreadyEnrolled} already enrolled.`,
      data: {
        enrolledCount,
        alreadyEnrolled,
        totalStudents: course.students.length
      }
    });
  } catch (error) {
    console.error('Bulk enroll error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error enrolling students'
    });
  }
});

// @route   GET /api/courses/:id/sessions
// @desc    Get sessions for a course
// @access  Private
router.get('/:id/sessions', authenticate, validateObjectId('id'), validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check access permissions
    if (req.user.role === 'student') {
      const hasAccess = req.user.courses.some(courseId => 
        courseId.equals(course._id)
      );
      
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    } else if (req.user.role === 'lecturer') {
      if (!course.lecturer.equals(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    let filter = { course: req.params.id };
    if (status) filter.status = status;

    const sessions = await Session.find(filter)
      .populate('lecturer', 'firstName lastName')
      .sort({ startTime: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalSessions = await Session.countDocuments(filter);

    // Add attendance stats for lecturers and admins
    let sessionsWithStats = sessions;
    if (req.user.role === 'lecturer' || req.user.role === 'admin') {
      sessionsWithStats = await Promise.all(
        sessions.map(async (session) => {
          const attendanceCount = await Attendance.countDocuments({ session: session._id });
          return {
            ...session.toObject(),
            attendanceCount,
            attendanceRate: session.totalStudents > 0 
              ? ((attendanceCount / session.totalStudents) * 100).toFixed(2)
              : 0
          };
        })
      );
    }

    res.json({
      success: true,
      data: {
        sessions: sessionsWithStats,
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
    console.error('Get course sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving course sessions'
    });
  }
});

// @route   GET /api/courses/:id/students
// @desc    Get students enrolled in course with attendance stats
// @access  Private (Lecturer/Admin only)
router.get('/:id/students', authenticate, authorize('lecturer', 'admin'), validateObjectId('id'), validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check permissions for lecturers
    if (req.user.role === 'lecturer' && !course.lecturer.equals(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const students = await User.find({
      _id: { $in: course.students },
      isActive: true
    })
      .select('firstName lastName email registrationNumber')
      .sort({ lastName: 1, firstName: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Get attendance statistics for each student
    const studentsWithStats = await Promise.all(
      students.map(async (student) => {
        const attendanceStats = await Attendance.getAttendanceStats({
          student: student._id,
          course: req.params.id
        });

        return {
          ...student.toObject(),
          attendanceStats
        };
      })
    );

    const totalStudents = course.students.length;

    res.json({
      success: true,
      data: {
        course: {
          _id: course._id,
          name: course.name,
          code: course.code
        },
        students: studentsWithStats,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalStudents / parseInt(limit)),
          totalStudents,
          hasNext: skip + students.length < totalStudents,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Get course students error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving course students'
    });
  }
});

module.exports = router;
