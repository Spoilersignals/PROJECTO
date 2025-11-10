const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  course: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course'
  },
  courseCode: {
    type: String,
    trim: true
  },
  courseName: {
    type: String,
    trim: true
  },
  lecturer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  sessionType: {
    type: String,
    enum: ['lecture', 'tutorial', 'lab', 'seminar', 'exam'],
    default: 'lecture'
  },
  location: {
    type: mongoose.Schema.Types.Mixed
  },
  wifiSSID: {
    type: String,
    trim: true
  },
  allowedRadius: {
    type: Number,
    default: 50
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  attendanceWindowStart: {
    type: Date,
    required: true
  },
  attendanceWindowEnd: {
    type: Date,
    required: true
  },
  allowedIpRanges: [{
    type: String,
    required: true
  }],
  status: {
    type: String,
    enum: ['scheduled', 'active', 'ended', 'cancelled'],
    default: 'scheduled'
  },
  attendanceCount: {
    type: Number,
    default: 0
  },
  totalStudents: {
    type: Number,
    default: 0
  },
  settings: {
    requireLocationVerification: {
      type: Boolean,
      default: true
    },
    allowLateEntry: {
      type: Boolean,
      default: false
    },
    lateEntryMinutes: {
      type: Number,
      default: 15,
      min: 5,
      max: 60
    },
    autoEnd: {
      type: Boolean,
      default: true
    }
  },
  metadata: {
    createdByIp: String,
    lastModifiedByIp: String
  }
}, {
  timestamps: true
});

// Indexes for performance
sessionSchema.index({ course: 1, startTime: -1 });
sessionSchema.index({ lecturer: 1, startTime: -1 });
sessionSchema.index({ status: 1, startTime: 1 });
sessionSchema.index({ 'startTime': 1, 'endTime': 1 });

// Validate that endTime is after startTime
sessionSchema.pre('save', function(next) {
  if (this.endTime <= this.startTime) {
    next(new Error('End time must be after start time'));
  }
  
  if (this.attendanceWindowEnd <= this.attendanceWindowStart) {
    next(new Error('Attendance window end must be after start'));
  }
  
  next();
});

// Virtual to check if session is currently active
sessionSchema.virtual('isCurrentlyActive').get(function() {
  const now = new Date();
  return now >= this.attendanceWindowStart && now <= this.attendanceWindowEnd;
});

// Virtual to check if session has expired
sessionSchema.virtual('hasExpired').get(function() {
  return new Date() > this.attendanceWindowEnd;
});

sessionSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Session', sessionSchema);
