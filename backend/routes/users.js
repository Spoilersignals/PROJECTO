const express = require('express');
const User = require('../models/User');
const Course = require('../models/Course');
const { authenticate, authorize } = require('../middleware/auth');
const { validateObjectId, validatePagination } = require('../middleware/validation');

const router = express.Router();

// @route   GET /api/users
// @desc    Get all users with filtering and pagination
// @access  Private (Admin only)
router.get('/', authenticate, authorize('admin'), validatePagination, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      role,
      institution,
      search,
      isActive
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter
    let filter = {};

    if (role) filter.role = role;
    if (institution) filter.institution = institution;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    // Search functionality
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { registrationNumber: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(filter)
      .populate('institution', 'name code')
      .populate('courses', 'name code')
      .select('-password -refreshTokens')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalUsers = await User.countDocuments(filter);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalUsers / parseInt(limit)),
          totalUsers,
          hasNext: skip + users.length < totalUsers,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving users'
    });
  }
});

// @route   GET /api/users/:id
// @desc    Get single user by ID
// @access  Private (Admin or own profile)
router.get('/:id', authenticate, validateObjectId('id'), async (req, res) => {
  try {
    const userId = req.params.id;

    // Check permissions
    if (req.user.role !== 'admin' && !req.user._id.equals(userId)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const user = await User.findById(userId)
      .populate('institution', 'name code allowedIpRanges')
      .populate('courses', 'name code lecturer')
      .select('-password -refreshTokens');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: {
        user
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving user'
    });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user
// @access  Private (Admin or own profile for limited fields)
router.put('/:id', authenticate, validateObjectId('id'), async (req, res) => {
  try {
    const userId = req.params.id;
    const isOwnProfile = req.user._id.equals(userId);

    // Check permissions
    if (req.user.role !== 'admin' && !isOwnProfile) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Define allowed updates based on role
    let allowedUpdates;
    
    if (req.user.role === 'admin') {
      allowedUpdates = [
        'firstName', 'lastName', 'email', 'role', 
        'registrationNumber', 'employeeId', 'institution', 
        'isActive', 'courses'
      ];
    } else {
      // Users can only update their own basic info
      allowedUpdates = ['firstName', 'lastName'];
    }

    // Apply updates
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field];
      }
    });

    // Special validation for role changes
    if (req.body.role && req.body.role !== user.role) {
      if (req.body.role === 'student' && !req.body.registrationNumber && !user.registrationNumber) {
        return res.status(400).json({
          success: false,
          message: 'Registration number required for student role'
        });
      }
      
      if (req.body.role === 'lecturer' && !req.body.employeeId && !user.employeeId) {
        return res.status(400).json({
          success: false,
          message: 'Employee ID required for lecturer role'
        });
      }
    }

    await user.save();

    await user.populate([
      { path: 'institution', select: 'name code' },
      { path: 'courses', select: 'name code' }
    ]);

    // Remove sensitive data
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.refreshTokens;

    res.json({
      success: true,
      message: 'User updated successfully',
      data: {
        user: userResponse
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating user'
    });
  }
});

// @route   DELETE /api/users/:id
// @desc    Deactivate/Delete user
// @access  Private (Admin only)
router.delete('/:id', authenticate, authorize('admin'), validateObjectId('id'), async (req, res) => {
  try {
    const userId = req.params.id;
    const { permanent = false } = req.query;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent deletion of the last admin
    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin', isActive: true });
      if (adminCount <= 1) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete the last active admin user'
        });
      }
    }

    if (permanent === 'true') {
      await User.findByIdAndDelete(userId);
      res.json({
        success: true,
        message: 'User deleted permanently'
      });
    } else {
      // Soft delete - deactivate user
      user.isActive = false;
      user.refreshTokens = []; // Clear all sessions
      await user.save();

      res.json({
        success: true,
        message: 'User deactivated successfully'
      });
    }
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting user'
    });
  }
});

// @route   POST /api/users/:id/activate
// @desc    Reactivate user
// @access  Private (Admin only)
router.post('/:id/activate', authenticate, authorize('admin'), validateObjectId('id'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.isActive = true;
    await user.save();

    res.json({
      success: true,
      message: 'User activated successfully',
      data: { user: { _id: user._id, isActive: user.isActive } }
    });
  } catch (error) {
    console.error('Activate user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error activating user'
    });
  }
});

// @route   GET /api/users/lecturers/available
// @desc    Get available lecturers for course assignment
// @access  Private (Admin only)
router.get('/lecturers/available', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { institutionId } = req.query;

    let filter = { role: 'lecturer', isActive: true };
    if (institutionId) filter.institution = institutionId;

    const lecturers = await User.find(filter)
      .populate('institution', 'name code')
      .select('firstName lastName email employeeId')
      .sort({ lastName: 1, firstName: 1 });

    res.json({
      success: true,
      data: {
        lecturers
      }
    });
  } catch (error) {
    console.error('Get available lecturers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving lecturers'
    });
  }
});

// @route   GET /api/users/students/course/:courseId
// @desc    Get students enrolled in a course
// @access  Private (Lecturer/Admin only)
router.get('/students/course/:courseId', authenticate, authorize('lecturer', 'admin'), validateObjectId('courseId'), async (req, res) => {
  try {
    const { courseId } = req.params;

    // Verify course access for lecturers
    if (req.user.role === 'lecturer') {
      const course = await Course.findById(courseId);
      if (!course || !course.lecturer.equals(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    const students = await User.find({
      role: 'student',
      courses: courseId,
      isActive: true
    })
      .select('firstName lastName email registrationNumber')
      .sort({ lastName: 1, firstName: 1 });

    res.json({
      success: true,
      data: {
        students,
        totalStudents: students.length
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

// @route   POST /api/users/:userId/enroll/:courseId
// @desc    Enroll student in course
// @access  Private (Admin/Lecturer only)
router.post('/:userId/enroll/:courseId', authenticate, authorize('lecturer', 'admin'), validateObjectId('userId'), validateObjectId('courseId'), async (req, res) => {
  try {
    const { userId, courseId } = req.params;

    // Verify course access for lecturers
    if (req.user.role === 'lecturer') {
      const course = await Course.findById(courseId);
      if (!course || !course.lecturer.equals(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    const user = await User.findById(userId);
    const course = await Course.findById(courseId);

    if (!user || !course) {
      return res.status(404).json({
        success: false,
        message: 'User or course not found'
      });
    }

    if (user.role !== 'student') {
      return res.status(400).json({
        success: false,
        message: 'Only students can be enrolled in courses'
      });
    }

    // Check if already enrolled
    if (user.courses.includes(courseId)) {
      return res.status(400).json({
        success: false,
        message: 'Student is already enrolled in this course'
      });
    }

    // Add student to course
    user.courses.push(courseId);
    await user.save();

    // Add student to course's student list
    if (!course.students.includes(userId)) {
      course.students.push(userId);
      await course.save();
    }

    res.json({
      success: true,
      message: 'Student enrolled successfully',
      data: {
        student: {
          _id: user._id,
          fullName: user.fullName,
          registrationNumber: user.registrationNumber
        },
        course: {
          _id: course._id,
          name: course.name,
          code: course.code
        }
      }
    });
  } catch (error) {
    console.error('Enroll student error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error enrolling student'
    });
  }
});

// @route   DELETE /api/users/:userId/unenroll/:courseId
// @desc    Unenroll student from course
// @access  Private (Admin/Lecturer only)
router.delete('/:userId/unenroll/:courseId', authenticate, authorize('lecturer', 'admin'), validateObjectId('userId'), validateObjectId('courseId'), async (req, res) => {
  try {
    const { userId, courseId } = req.params;

    // Verify course access for lecturers
    if (req.user.role === 'lecturer') {
      const course = await Course.findById(courseId);
      if (!course || !course.lecturer.equals(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }
    }

    const user = await User.findById(userId);
    const course = await Course.findById(courseId);

    if (!user || !course) {
      return res.status(404).json({
        success: false,
        message: 'User or course not found'
      });
    }

    // Remove student from course
    user.courses = user.courses.filter(id => !id.equals(courseId));
    await user.save();

    // Remove student from course's student list
    course.students = course.students.filter(id => !id.equals(userId));
    await course.save();

    res.json({
      success: true,
      message: 'Student unenrolled successfully'
    });
  } catch (error) {
    console.error('Unenroll student error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error unenrolling student'
    });
  }
});

module.exports = router;
