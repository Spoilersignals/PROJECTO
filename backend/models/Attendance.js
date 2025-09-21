const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  session: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Session',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  markedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  studentIp: {
    type: String,
    required: true
  },
  location: {
    type: String,
    default: ''
  },
  deviceInfo: {
    userAgent: String,
    platform: String,
    browser: String
  },
  status: {
    type: String,
    enum: ['present', 'late', 'excused'],
    default: 'present'
  },
  isLate: {
    type: Boolean,
    default: false
  },
  minutesLate: {
    type: Number,
    default: 0,
    min: 0
  },
  verificationMethod: {
    type: String,
    enum: ['ip', 'manual', 'override'],
    default: 'ip'
  },
  notes: {
    type: String,
    trim: true,
    maxlength: 500
  },
  metadata: {
    sessionTitle: String,
    courseName: String,
    courseCode: String,
    lecturerName: String,
    academicYear: String,
    semester: String
  }
}, {
  timestamps: true
});

// Compound index to prevent duplicate attendance
attendanceSchema.index({ session: 1, student: 1 }, { unique: true });
attendanceSchema.index({ course: 1, student: 1, createdAt: -1 });
attendanceSchema.index({ session: 1, markedAt: -1 });
attendanceSchema.index({ student: 1, createdAt: -1 });

// Pre-save middleware to set metadata
attendanceSchema.pre('save', async function(next) {
  if (this.isNew) {
    try {
      await this.populate([
        { path: 'session', populate: { path: 'course lecturer' } },
        { path: 'student' },
        { path: 'course' }
      ]);

      if (this.session && this.session.course) {
        this.metadata = {
          sessionTitle: this.session.title,
          courseName: this.session.course.name,
          courseCode: this.session.course.code,
          lecturerName: this.session.lecturer ? 
            `${this.session.lecturer.firstName} ${this.session.lecturer.lastName}` : '',
          academicYear: this.session.course.academicYear,
          semester: this.session.course.semester
        };
      }

      // Calculate if late
      const sessionStart = this.session.attendanceWindowStart;
      const markedTime = this.markedAt;
      
      if (markedTime > sessionStart) {
        this.isLate = true;
        this.minutesLate = Math.floor((markedTime - sessionStart) / (1000 * 60));
        
        // Set status based on lateness
        if (this.minutesLate > 15) {
          this.status = 'late';
        }
      }
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Static method to get attendance statistics
attendanceSchema.statics.getAttendanceStats = async function(filters = {}) {
  const pipeline = [
    { $match: filters },
    {
      $group: {
        _id: null,
        totalSessions: { $addToSet: '$session' },
        totalAttendance: { $sum: 1 },
        presentCount: {
          $sum: { $cond: [{ $eq: ['$status', 'present'] }, 1, 0] }
        },
        lateCount: {
          $sum: { $cond: [{ $eq: ['$status', 'late'] }, 1, 0] }
        },
        averageMinutesLate: { $avg: '$minutesLate' }
      }
    },
    {
      $project: {
        totalSessions: { $size: '$totalSessions' },
        totalAttendance: 1,
        presentCount: 1,
        lateCount: 1,
        attendanceRate: {
          $multiply: [
            { $divide: ['$presentCount', '$totalAttendance'] },
            100
          ]
        },
        averageMinutesLate: { $round: ['$averageMinutesLate', 1] }
      }
    }
  ];

  const result = await this.aggregate(pipeline);
  return result[0] || {
    totalSessions: 0,
    totalAttendance: 0,
    presentCount: 0,
    lateCount: 0,
    attendanceRate: 0,
    averageMinutesLate: 0
  };
};

module.exports = mongoose.model('Attendance', attendanceSchema);
