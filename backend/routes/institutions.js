const express = require('express');
const Institution = require('../models/Institution');
const User = require('../models/User');
const Course = require('../models/Course');
const { authenticate, authorize } = require('../middleware/auth');
const { validateInstitutionCreation, validateObjectId, validatePagination } = require('../middleware/validation');

const router = express.Router();

// @route   POST /api/institutions
// @desc    Create new institution
// @access  Private (Admin only)
router.post('/', authenticate, authorize('admin'), validateInstitutionCreation, async (req, res) => {
  try {
    const {
      name,
      code,
      address,
      allowedIpRanges,
      settings
    } = req.body;

    // Check if institution with same name or code exists
    const existingInstitution = await Institution.findOne({
      $or: [{ name }, { code }]
    });

    if (existingInstitution) {
      let message = 'Institution already exists';
      if (existingInstitution.name === name) message = 'Institution name already exists';
      else if (existingInstitution.code === code) message = 'Institution code already exists';

      return res.status(400).json({
        success: false,
        message
      });
    }

    // Format IP ranges
    const formattedIpRanges = allowedIpRanges.map(range => ({
      range: typeof range === 'string' ? range : range.range,
      description: typeof range === 'string' ? '' : (range.description || '')
    }));

    const institution = new Institution({
      name,
      code: code.toUpperCase(),
      address: address || {},
      allowedIpRanges: formattedIpRanges,
      settings: settings || {}
    });

    await institution.save();

    res.status(201).json({
      success: true,
      message: 'Institution created successfully',
      data: {
        institution
      }
    });
  } catch (error) {
    console.error('Create institution error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating institution'
    });
  }
});

// @route   GET /api/institutions
// @desc    Get all institutions with filtering and pagination
// @access  Private (Admin only)
router.get('/', authenticate, authorize('admin'), validatePagination, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      isActive
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter
    let filter = {};

    if (isActive !== undefined) filter.isActive = isActive === 'true';

    // Search functionality
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } }
      ];
    }

    const institutions = await Institution.find(filter)
      .sort({ name: 1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalInstitutions = await Institution.countDocuments(filter);

    // Get user counts for each institution
    const institutionsWithStats = await Promise.all(
      institutions.map(async (institution) => {
        const userCounts = await User.aggregate([
          { $match: { institution: institution._id } },
          { $group: { _id: '$role', count: { $sum: 1 } } }
        ]);

        const courseCount = await Course.countDocuments({ institution: institution._id });

        const stats = {
          totalUsers: userCounts.reduce((sum, role) => sum + role.count, 0),
          students: userCounts.find(role => role._id === 'student')?.count || 0,
          lecturers: userCounts.find(role => role._id === 'lecturer')?.count || 0,
          admins: userCounts.find(role => role._id === 'admin')?.count || 0,
          totalCourses: courseCount
        };

        return {
          ...institution.toObject(),
          stats
        };
      })
    );

    res.json({
      success: true,
      data: {
        institutions: institutionsWithStats,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalInstitutions / parseInt(limit)),
          totalInstitutions,
          hasNext: skip + institutions.length < totalInstitutions,
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Get institutions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving institutions'
    });
  }
});

// @route   GET /api/institutions/list
// @desc    Get simple list of active institutions (for dropdowns)
// @access  Public
router.get('/list', async (req, res) => {
  try {
    const institutions = await Institution.find({ isActive: true })
      .select('_id name code')
      .sort({ name: 1 });

    res.json({
      success: true,
      data: {
        institutions
      }
    });
  } catch (error) {
    console.error('Get institutions list error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving institutions list'
    });
  }
});

// @route   GET /api/institutions/:id
// @desc    Get single institution by ID
// @access  Private (Admin only)
router.get('/:id', authenticate, authorize('admin'), validateObjectId('id'), async (req, res) => {
  try {
    const institution = await Institution.findById(req.params.id);

    if (!institution) {
      return res.status(404).json({
        success: false,
        message: 'Institution not found'
      });
    }

    // Get detailed statistics
    const userStats = await User.aggregate([
      { $match: { institution: institution._id } },
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 },
          active: { $sum: { $cond: ['$isActive', 1, 0] } }
        }
      }
    ]);

    const courseCount = await Course.countDocuments({ institution: institution._id });
    const activeCourseCount = await Course.countDocuments({ 
      institution: institution._id, 
      isActive: true 
    });

    const stats = {
      users: {
        total: userStats.reduce((sum, role) => sum + role.count, 0),
        active: userStats.reduce((sum, role) => sum + role.active, 0),
        byRole: userStats.reduce((acc, role) => {
          acc[role._id] = {
            total: role.count,
            active: role.active
          };
          return acc;
        }, {})
      },
      courses: {
        total: courseCount,
        active: activeCourseCount
      }
    };

    res.json({
      success: true,
      data: {
        institution,
        stats
      }
    });
  } catch (error) {
    console.error('Get institution error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving institution'
    });
  }
});

// @route   PUT /api/institutions/:id
// @desc    Update institution
// @access  Private (Admin only)
router.put('/:id', authenticate, authorize('admin'), validateObjectId('id'), async (req, res) => {
  try {
    const {
      name,
      code,
      address,
      allowedIpRanges,
      isActive,
      settings
    } = req.body;

    const institution = await Institution.findById(req.params.id);

    if (!institution) {
      return res.status(404).json({
        success: false,
        message: 'Institution not found'
      });
    }

    // Check for duplicate name/code (excluding current institution)
    if (name || code) {
      const duplicateCheck = {};
      if (name) duplicateCheck.name = name;
      if (code) duplicateCheck.code = code.toUpperCase();

      const existingInstitution = await Institution.findOne({
        $or: Object.keys(duplicateCheck).map(key => ({ [key]: duplicateCheck[key] })),
        _id: { $ne: req.params.id }
      });

      if (existingInstitution) {
        let message = 'Conflict with existing institution';
        if (existingInstitution.name === name) message = 'Institution name already exists';
        else if (existingInstitution.code === code?.toUpperCase()) message = 'Institution code already exists';

        return res.status(400).json({
          success: false,
          message
        });
      }
    }

    // Update fields
    if (name) institution.name = name;
    if (code) institution.code = code.toUpperCase();
    if (address) institution.address = address;
    if (isActive !== undefined) institution.isActive = isActive;
    if (settings) institution.settings = { ...institution.settings, ...settings };

    if (allowedIpRanges) {
      institution.allowedIpRanges = allowedIpRanges.map(range => ({
        range: typeof range === 'string' ? range : range.range,
        description: typeof range === 'string' ? '' : (range.description || '')
      }));
    }

    await institution.save();

    res.json({
      success: true,
      message: 'Institution updated successfully',
      data: {
        institution
      }
    });
  } catch (error) {
    console.error('Update institution error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating institution'
    });
  }
});

// @route   DELETE /api/institutions/:id
// @desc    Delete institution (if no associated users/courses)
// @access  Private (Admin only)
router.delete('/:id', authenticate, authorize('admin'), validateObjectId('id'), async (req, res) => {
  try {
    const institution = await Institution.findById(req.params.id);

    if (!institution) {
      return res.status(404).json({
        success: false,
        message: 'Institution not found'
      });
    }

    // Check for associated users
    const userCount = await User.countDocuments({ institution: req.params.id });
    if (userCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete institution. It has ${userCount} associated users.`
      });
    }

    // Check for associated courses
    const courseCount = await Course.countDocuments({ institution: req.params.id });
    if (courseCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete institution. It has ${courseCount} associated courses.`
      });
    }

    await Institution.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Institution deleted successfully'
    });
  } catch (error) {
    console.error('Delete institution error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting institution'
    });
  }
});

// @route   POST /api/institutions/:id/deactivate
// @desc    Deactivate institution
// @access  Private (Admin only)
router.post('/:id/deactivate', authenticate, authorize('admin'), validateObjectId('id'), async (req, res) => {
  try {
    const institution = await Institution.findById(req.params.id);

    if (!institution) {
      return res.status(404).json({
        success: false,
        message: 'Institution not found'
      });
    }

    institution.isActive = false;
    await institution.save();

    // Optionally deactivate all users in this institution
    const { deactivateUsers = false } = req.body;
    if (deactivateUsers) {
      await User.updateMany(
        { institution: req.params.id },
        { isActive: false }
      );
    }

    res.json({
      success: true,
      message: 'Institution deactivated successfully',
      data: {
        institution,
        usersDeactivated: deactivateUsers
      }
    });
  } catch (error) {
    console.error('Deactivate institution error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deactivating institution'
    });
  }
});

// @route   POST /api/institutions/:id/activate
// @desc    Activate institution
// @access  Private (Admin only)
router.post('/:id/activate', authenticate, authorize('admin'), validateObjectId('id'), async (req, res) => {
  try {
    const institution = await Institution.findById(req.params.id);

    if (!institution) {
      return res.status(404).json({
        success: false,
        message: 'Institution not found'
      });
    }

    institution.isActive = true;
    await institution.save();

    res.json({
      success: true,
      message: 'Institution activated successfully',
      data: {
        institution
      }
    });
  } catch (error) {
    console.error('Activate institution error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error activating institution'
    });
  }
});

module.exports = router;
