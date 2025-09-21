const express = require('express');
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');
const Attendance = require('../models/Attendance');
const Session = require('../models/Session');
const Course = require('../models/Course');
const User = require('../models/User');
const { authenticate, authorize } = require('../middleware/auth');
const { validateObjectId } = require('../middleware/validation');

const router = express.Router();

// @route   GET /api/reports/attendance/excel
// @desc    Generate Excel attendance report
// @access  Private (Lecturer/Admin only)
router.get('/attendance/excel', authenticate, authorize('lecturer', 'admin'), async (req, res) => {
  try {
    const {
      courseId,
      sessionId,
      studentId,
      startDate,
      endDate,
      format = 'detailed'
    } = req.query;

    // Build filter
    let filter = {};
    
    if (req.user.role === 'lecturer') {
      const lecturerCourses = await Course.find({ lecturer: req.user._id }).select('_id');
      filter.course = { $in: lecturerCourses.map(c => c._id) };
    }

    if (courseId) filter.course = courseId;
    if (sessionId) filter.session = sessionId;
    if (studentId) filter.student = studentId;

    if (startDate || endDate) {
      filter.markedAt = {};
      if (startDate) filter.markedAt.$gte = new Date(startDate);
      if (endDate) filter.markedAt.$lte = new Date(endDate);
    }

    const attendanceRecords = await Attendance.find(filter)
      .populate([
        {
          path: 'student',
          select: 'firstName lastName registrationNumber email'
        },
        {
          path: 'session',
          select: 'title startTime endTime sessionType',
          populate: {
            path: 'course',
            select: 'name code'
          }
        }
      ])
      .sort({ markedAt: -1 });

    if (attendanceRecords.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No attendance records found for the specified criteria'
      });
    }

    // Prepare data for Excel
    let worksheetData = [];

    if (format === 'summary') {
      // Summary format - grouped by student
      const studentSummary = {};
      
      attendanceRecords.forEach(record => {
        const studentId = record.student._id.toString();
        if (!studentSummary[studentId]) {
          studentSummary[studentId] = {
            'Student Name': record.student.fullName,
            'Registration Number': record.student.registrationNumber,
            'Email': record.student.email,
            'Total Sessions': 0,
            'Present': 0,
            'Late': 0,
            'Attendance Rate': 0
          };
        }
        
        studentSummary[studentId]['Total Sessions']++;
        if (record.status === 'present') studentSummary[studentId]['Present']++;
        if (record.status === 'late') studentSummary[studentId]['Late']++;
      });

      // Calculate attendance rates
      Object.keys(studentSummary).forEach(studentId => {
        const summary = studentSummary[studentId];
        summary['Attendance Rate'] = 
          ((summary['Present'] / summary['Total Sessions']) * 100).toFixed(2) + '%';
      });

      worksheetData = Object.values(studentSummary);
    } else {
      // Detailed format
      worksheetData = attendanceRecords.map(record => ({
        'Date': record.markedAt.toLocaleDateString(),
        'Time': record.markedAt.toLocaleTimeString(),
        'Student Name': record.student.fullName,
        'Registration Number': record.student.registrationNumber,
        'Course': record.session.course.name,
        'Course Code': record.session.course.code,
        'Session': record.session.title,
        'Session Type': record.session.sessionType,
        'Status': record.status,
        'Late Minutes': record.isLate ? record.minutesLate : 0,
        'IP Address': record.studentIp,
        'Location': record.location,
        'Notes': record.notes || ''
      }));
    }

    // Create workbook and worksheet
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);

    // Set column widths
    const colWidths = Object.keys(worksheetData[0] || {}).map(key => ({
      wch: Math.max(key.length, 20)
    }));
    worksheet['!cols'] = colWidths;

    // Add worksheet to workbook
    const sheetName = format === 'summary' ? 'Attendance Summary' : 'Attendance Details';
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Set response headers
    const filename = `attendance_report_${new Date().toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);

    res.send(buffer);
  } catch (error) {
    console.error('Generate Excel report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error generating Excel report'
    });
  }
});

// @route   GET /api/reports/attendance/pdf
// @desc    Generate PDF attendance report
// @access  Private (Lecturer/Admin only)
router.get('/attendance/pdf', authenticate, authorize('lecturer', 'admin'), async (req, res) => {
  try {
    const {
      courseId,
      sessionId,
      startDate,
      endDate
    } = req.query;

    // Build filter
    let filter = {};
    
    if (req.user.role === 'lecturer') {
      const lecturerCourses = await Course.find({ lecturer: req.user._id }).select('_id');
      filter.course = { $in: lecturerCourses.map(c => c._id) };
    }

    if (courseId) filter.course = courseId;
    if (sessionId) filter.session = sessionId;

    if (startDate || endDate) {
      filter.markedAt = {};
      if (startDate) filter.markedAt.$gte = new Date(startDate);
      if (endDate) filter.markedAt.$lte = new Date(endDate);
    }

    const attendanceRecords = await Attendance.find(filter)
      .populate([
        {
          path: 'student',
          select: 'firstName lastName registrationNumber'
        },
        {
          path: 'session',
          select: 'title startTime endTime sessionType',
          populate: {
            path: 'course lecturer',
            select: 'name code firstName lastName'
          }
        }
      ])
      .sort({ markedAt: -1 });

    if (attendanceRecords.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No attendance records found for the specified criteria'
      });
    }

    // Create PDF document
    const doc = new PDFDocument({ margin: 50 });

    // Set response headers
    const filename = `attendance_report_${new Date().toISOString().split('T')[0]}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Pipe PDF to response
    doc.pipe(res);

    // Add title
    doc.fontSize(20).text('Attendance Report', { align: 'center' });
    doc.fontSize(12).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
    doc.moveDown(2);

    // Add summary statistics
    const totalRecords = attendanceRecords.length;
    const uniqueStudents = new Set(attendanceRecords.map(r => r.student._id.toString())).size;
    const uniqueSessions = new Set(attendanceRecords.map(r => r.session._id.toString())).size;
    const presentCount = attendanceRecords.filter(r => r.status === 'present').length;
    const lateCount = attendanceRecords.filter(r => r.status === 'late').length;

    doc.fontSize(14).text('Summary Statistics', { underline: true });
    doc.fontSize(12)
       .text(`Total Attendance Records: ${totalRecords}`)
       .text(`Unique Students: ${uniqueStudents}`)
       .text(`Unique Sessions: ${uniqueSessions}`)
       .text(`Present: ${presentCount}`)
       .text(`Late: ${lateCount}`)
       .text(`Attendance Rate: ${((presentCount / totalRecords) * 100).toFixed(2)}%`);
    
    doc.moveDown(2);

    // Add detailed records
    doc.fontSize(14).text('Attendance Records', { underline: true });
    doc.moveDown(1);

    let yPosition = doc.y;
    const pageHeight = doc.page.height - 100; // Leave margin for footer

    attendanceRecords.forEach((record, index) => {
      // Check if we need a new page
      if (yPosition > pageHeight) {
        doc.addPage();
        yPosition = 50;
      }

      const recordText = [
        `${index + 1}. ${record.student.fullName} (${record.student.registrationNumber})`,
        `   Course: ${record.session.course.name} (${record.session.course.code})`,
        `   Session: ${record.session.title}`,
        `   Date/Time: ${record.markedAt.toLocaleString()}`,
        `   Status: ${record.status.toUpperCase()}`,
        `   ${record.isLate ? `Late by ${record.minutesLate} minutes` : ''}`,
        `   Location: ${record.location}`,
        record.notes ? `   Notes: ${record.notes}` : '',
        '' // Empty line for spacing
      ].filter(line => line !== '').join('\n');

      doc.fontSize(10).text(recordText, { align: 'left' });
      yPosition = doc.y + 10;
      doc.y = yPosition;
    });

    // Add footer
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      doc.fontSize(8)
         .text(`Page ${i + 1} of ${pageCount}`, 
               doc.page.width - 100, 
               doc.page.height - 30,
               { align: 'right' });
    }

    // Finalize the PDF
    doc.end();
  } catch (error) {
    console.error('Generate PDF report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error generating PDF report'
    });
  }
});

// @route   GET /api/reports/session/:sessionId/excel
// @desc    Generate Excel report for specific session
// @access  Private (Lecturer/Admin only)
router.get('/session/:sessionId/excel', authenticate, authorize('lecturer', 'admin'), validateObjectId('sessionId'), async (req, res) => {
  try {
    const session = await Session.findById(req.params.sessionId)
      .populate([
        { path: 'course', select: 'name code students' },
        { path: 'lecturer', select: 'firstName lastName' }
      ]);

    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found'
      });
    }

    // Check permissions
    if (req.user.role === 'lecturer' && !session.lecturer._id.equals(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get all enrolled students
    const enrolledStudents = await User.find({
      _id: { $in: session.course.students },
      role: 'student'
    }).select('firstName lastName registrationNumber email');

    // Get attendance records for this session
    const attendanceRecords = await Attendance.find({ session: req.params.sessionId })
      .populate('student', 'firstName lastName registrationNumber email');

    // Create attendance map
    const attendanceMap = {};
    attendanceRecords.forEach(record => {
      attendanceMap[record.student._id.toString()] = record;
    });

    // Prepare data for Excel
    const worksheetData = enrolledStudents.map(student => {
      const attendance = attendanceMap[student._id.toString()];
      
      return {
        'Student Name': student.fullName,
        'Registration Number': student.registrationNumber,
        'Email': student.email,
        'Status': attendance ? attendance.status : 'Absent',
        'Time Marked': attendance ? attendance.markedAt.toLocaleString() : '',
        'Late Minutes': attendance && attendance.isLate ? attendance.minutesLate : 0,
        'IP Address': attendance ? attendance.studentIp : '',
        'Location': attendance ? attendance.location : '',
        'Notes': attendance ? (attendance.notes || '') : ''
      };
    });

    // Add session summary at the top
    const summaryData = [
      { Field: 'Session Title', Value: session.title },
      { Field: 'Course', Value: `${session.course.name} (${session.course.code})` },
      { Field: 'Date/Time', Value: session.startTime.toLocaleString() },
      { Field: 'Lecturer', Value: session.lecturer.fullName },
      { Field: 'Total Students', Value: enrolledStudents.length },
      { Field: 'Present', Value: attendanceRecords.length },
      { Field: 'Absent', Value: enrolledStudents.length - attendanceRecords.length },
      { Field: 'Attendance Rate', Value: `${((attendanceRecords.length / enrolledStudents.length) * 100).toFixed(2)}%` },
      {}  // Empty row for spacing
    ];

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Create summary worksheet
    const summaryWorksheet = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Session Summary');

    // Create detailed worksheet
    const detailWorksheet = XLSX.utils.json_to_sheet(worksheetData);
    XLSX.utils.book_append_sheet(workbook, detailWorksheet, 'Attendance Details');

    // Generate buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Set response headers
    const filename = `session_${session.course.code}_${session.startTime.toISOString().split('T')[0]}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);

    res.send(buffer);
  } catch (error) {
    console.error('Generate session Excel report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error generating session Excel report'
    });
  }
});

// @route   GET /api/reports/course/:courseId/summary
// @desc    Get course attendance summary report
// @access  Private (Lecturer/Admin only)
router.get('/course/:courseId/summary', authenticate, authorize('lecturer', 'admin'), validateObjectId('courseId'), async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId)
      .populate([
        { path: 'lecturer', select: 'firstName lastName' },
        { path: 'students', select: 'firstName lastName registrationNumber' }
      ]);

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check permissions
    if (req.user.role === 'lecturer' && !course.lecturer._id.equals(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get course statistics
    const totalSessions = await Session.countDocuments({ course: req.params.courseId });
    const completedSessions = await Session.countDocuments({ 
      course: req.params.courseId, 
      status: 'ended' 
    });

    // Get attendance statistics for each student
    const studentStats = await Promise.all(
      course.students.map(async (student) => {
        const attendanceRecords = await Attendance.find({
          course: req.params.courseId,
          student: student._id
        });

        const stats = await Attendance.getAttendanceStats({
          course: req.params.courseId,
          student: student._id
        });

        return {
          student: {
            _id: student._id,
            fullName: student.fullName,
            registrationNumber: student.registrationNumber
          },
          attendance: {
            totalAttended: attendanceRecords.length,
            totalSessions: completedSessions,
            attendanceRate: completedSessions > 0 
              ? ((attendanceRecords.length / completedSessions) * 100).toFixed(2)
              : 0,
            lateCount: attendanceRecords.filter(r => r.isLate).length,
            averageMinutesLate: stats.averageMinutesLate || 0
          }
        };
      })
    );

    // Overall course statistics
    const totalAttendanceRecords = await Attendance.countDocuments({ course: req.params.courseId });
    const overallStats = {
      totalStudents: course.students.length,
      totalSessions: totalSessions,
      completedSessions: completedSessions,
      totalAttendanceRecords: totalAttendanceRecords,
      overallAttendanceRate: (completedSessions * course.students.length) > 0
        ? ((totalAttendanceRecords / (completedSessions * course.students.length)) * 100).toFixed(2)
        : 0
    };

    res.json({
      success: true,
      data: {
        course: {
          _id: course._id,
          name: course.name,
          code: course.code,
          lecturer: course.lecturer
        },
        overallStats,
        studentStats
      }
    });
  } catch (error) {
    console.error('Get course summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error generating course summary'
    });
  }
});

// @route   GET /api/reports/statistics
// @desc    Get general attendance statistics
// @access  Private (Admin only)
router.get('/statistics', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { startDate, endDate, institutionId } = req.query;

    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    let institutionFilter = {};
    if (institutionId) {
      institutionFilter.institution = institutionId;
    }

    // Get overall statistics
    const [
      totalUsers,
      totalCourses,
      totalSessions,
      totalAttendanceRecords
    ] = await Promise.all([
      User.countDocuments({ ...institutionFilter, ...dateFilter }),
      Course.countDocuments({ ...institutionFilter, ...dateFilter }),
      Session.countDocuments({ ...dateFilter }),
      Attendance.countDocuments({ ...dateFilter })
    ]);

    // User statistics by role
    const usersByRole = await User.aggregate([
      { $match: { ...institutionFilter, ...dateFilter } },
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    // Session statistics by status
    const sessionsByStatus = await Session.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Attendance statistics by status
    const attendanceByStatus = await Attendance.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Monthly attendance trends (last 12 months)
    const monthlyTrends = await Attendance.aggregate([
      {
        $match: {
          markedAt: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$markedAt' },
            month: { $month: '$markedAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 }
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalCourses,
          totalSessions,
          totalAttendanceRecords
        },
        usersByRole: usersByRole.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        sessionsByStatus: sessionsByStatus.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        attendanceByStatus: attendanceByStatus.reduce((acc, item) => {
          acc[item._id] = item.count;
          return acc;
        }, {}),
        monthlyTrends: monthlyTrends.map(trend => ({
          period: `${trend._id.year}-${trend._id.month.toString().padStart(2, '0')}`,
          count: trend.count
        }))
      }
    });
  } catch (error) {
    console.error('Get statistics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving statistics'
    });
  }
});

module.exports = router;
