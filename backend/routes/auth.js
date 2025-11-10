const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Institution = require('../models/Institution');
const { authenticate } = require('../middleware/auth');
const { validateUserRegistration, validateLogin } = require('../middleware/validation');
const { extractClientIp } = require('../middleware/ipVerification');
const { generateVerificationCode, sendVerificationEmail } = require('../utils/emailService');

const router = express.Router();

// Generate JWT tokens
const generateTokens = (userId) => {
  const accessToken = jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '1h' }
  );

  const refreshToken = jwt.sign(
    { id: userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
  );

  return { accessToken, refreshToken };
};

// @route   POST /api/auth/register
// @desc    Register new user
// @access  Public
router.post('/register', extractClientIp, validateUserRegistration, async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      role,
      registrationNumber,
      employeeId,
      institution
    } = req.body;

    // Validate email domain against institution if institution is provided
    if (institution) {
      const institutionDoc = await Institution.findById(institution);
      
      if (!institutionDoc) {
        return res.status(400).json({
          success: false,
          message: 'Invalid institution'
        });
      }

      if (institutionDoc.allowedEmailDomains && institutionDoc.allowedEmailDomains.length > 0) {
        const emailDomain = email.split('@')[1]?.toLowerCase();
        const isAllowedDomain = institutionDoc.allowedEmailDomains.some(
          domain => emailDomain === domain.toLowerCase()
        );

        if (!isAllowedDomain) {
          return res.status(400).json({
            success: false,
            message: `Email domain not allowed. This institution only accepts emails from: ${institutionDoc.allowedEmailDomains.join(', ')}`
          });
        }
      }
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [
        { email },
        ...(registrationNumber ? [{ registrationNumber }] : []),
        ...(employeeId ? [{ employeeId }] : [])
      ]
    });

    if (existingUser) {
      let message = 'User already exists';
      if (existingUser.email === email) message = 'Email already registered';
      else if (existingUser.registrationNumber === registrationNumber) message = 'Registration number already exists';
      else if (existingUser.employeeId === employeeId) message = 'Employee ID already exists';

      return res.status(400).json({
        success: false,
        message
      });
    }

    // Generate verification code
    const verificationCode = generateVerificationCode();
    const verificationExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Create new user
    const userData = {
      firstName,
      lastName,
      email,
      password,
      role,
      institution,
      emailVerificationToken: verificationCode,
      emailVerificationExpires: verificationExpires,
      isEmailVerified: false
    };

    if (role === 'student' && registrationNumber) {
      userData.registrationNumber = registrationNumber;
    }

    if (role === 'lecturer' && employeeId) {
      userData.employeeId = employeeId;
    }

    const user = new User(userData);
    await user.save();

    // Send verification email
    const emailResult = await sendVerificationEmail(email, verificationCode, firstName);

    if (!emailResult.success) {
      console.error('Failed to send verification email:', emailResult.error);
    }

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.refreshTokens;
    delete userResponse.emailVerificationToken;

    res.status(201).json({
      success: true,
      message: 'Registration successful. Please check your email for verification code.',
      data: {
        user: userResponse,
        emailSent: emailResult.success
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
});

// @route   POST /api/auth/verify-email
// @desc    Verify email with code
// @access  Public
router.post('/verify-email', async (req, res) => {
  try {
    const { email, verificationCode } = req.body;

    if (!email || !verificationCode) {
      return res.status(400).json({
        success: false,
        message: 'Email and verification code are required'
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email already verified'
      });
    }

    if (!user.emailVerificationToken || !user.emailVerificationExpires) {
      return res.status(400).json({
        success: false,
        message: 'No verification code found. Please request a new one.'
      });
    }

    if (new Date() > user.emailVerificationExpires) {
      return res.status(400).json({
        success: false,
        message: 'Verification code expired. Please request a new one.'
      });
    }

    if (user.emailVerificationToken !== verificationCode) {
      return res.status(400).json({
        success: false,
        message: 'Invalid verification code'
      });
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    // Generate tokens for auto-login
    const { accessToken, refreshToken } = generateTokens(user._id);

    user.refreshTokens.push({
      token: refreshToken,
      createdAt: new Date()
    });
    await user.save();

    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.refreshTokens;

    res.json({
      success: true,
      message: 'Email verified successfully',
      data: {
        user: userResponse,
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during email verification'
    });
  }
});

// @route   POST /api/auth/resend-verification
// @desc    Resend verification email
// @access  Public
router.post('/resend-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email already verified'
      });
    }

    const verificationCode = generateVerificationCode();
    const verificationExpires = new Date(Date.now() + 60 * 60 * 1000);

    user.emailVerificationToken = verificationCode;
    user.emailVerificationExpires = verificationExpires;
    await user.save();

    const emailResult = await sendVerificationEmail(email, verificationCode, user.firstName);

    if (!emailResult.success) {
      return res.status(500).json({
        success: false,
        message: 'Failed to send verification email. Please try again later.'
      });
    }

    res.json({
      success: true,
      message: 'Verification code sent to your email'
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error resending verification email'
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', extractClientIp, validateLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('Login attempt for:', email);

    // Find user and populate institution
    const user = await User.findOne({ email }).populate('institution');

    if (!user) {
      console.log('User not found:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    console.log('User found - isActive:', user.isActive, 'isEmailVerified:', user.isEmailVerified);

    if (!user.isActive) {
      console.log('Account deactivated:', email);
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated. Please contact administrator.'
      });
    }

    if (!user.isEmailVerified) {
      console.log('Email not verified:', email);
      return res.status(401).json({
        success: false,
        message: 'Please verify your email before logging in. Check your inbox for the verification code.'
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    console.log('Password valid:', isPasswordValid);

    if (!isPasswordValid) {
      console.log('Invalid password for:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user._id);

    // Clean expired tokens and add new refresh token
    user.cleanExpiredTokens();
    user.refreshTokens.push({
      token: refreshToken,
      createdAt: new Date()
    });

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Remove sensitive data from response
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.refreshTokens;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userResponse,
        accessToken,
        refreshToken
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// @route   POST /api/auth/refresh
// @desc    Refresh access token
// @access  Public
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required'
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token type'
      });
    }

    // Find user and check if refresh token exists
    const user = await User.findById(decoded.id).populate('institution');

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    const tokenExists = user.refreshTokens.some(
      tokenObj => tokenObj.token === refreshToken
    );

    if (!tokenExists) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token not found'
      });
    }

    // Generate new tokens
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(user._id);

    // Replace old refresh token with new one
    user.refreshTokens = user.refreshTokens.filter(
      tokenObj => tokenObj.token !== refreshToken
    );
    user.refreshTokens.push({
      token: newRefreshToken,
      createdAt: new Date()
    });
    await user.save();

    // Remove sensitive data from response
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.refreshTokens;

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        user: userResponse,
        accessToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }

    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during token refresh'
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user (invalidate refresh token)
// @access  Private
router.post('/logout', authenticate, async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (refreshToken) {
      // Remove specific refresh token
      req.user.refreshTokens = req.user.refreshTokens.filter(
        tokenObj => tokenObj.token !== refreshToken
      );
    } else {
      // Remove all refresh tokens (logout from all devices)
      req.user.refreshTokens = [];
    }

    await req.user.save();

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user info
// @access  Private
router.get('/me', authenticate, async (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        user: req.user
      }
    });
  } catch (error) {
    console.error('Get user info error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error retrieving user information'
    });
  }
});

// @route   PUT /api/auth/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required'
      });
    }

    // Get user with password
    const user = await User.findById(req.user._id);

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);

    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Validate new password
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters long'
      });
    }

    // Update password
    user.password = newPassword;
    
    // Clear all refresh tokens to force re-login
    user.refreshTokens = [];
    
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully. Please login again.'
    });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error changing password'
    });
  }
});

module.exports = router;
