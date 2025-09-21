const mongoose = require('mongoose');

const institutionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  code: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  allowedIpRanges: [{
    range: {
      type: String,
      required: true
    },
    description: {
      type: String,
      default: ''
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  settings: {
    sessionDurationMinutes: {
      type: Number,
      default: 120,
      min: 15,
      max: 480
    },
    allowLateAttendance: {
      type: Boolean,
      default: false
    },
    lateAttendanceMinutes: {
      type: Number,
      default: 15,
      min: 5,
      max: 60
    }
  }
}, {
  timestamps: true
});

institutionSchema.index({ code: 1 });
institutionSchema.index({ name: 1 });

module.exports = mongoose.model('Institution', institutionSchema);
