const ipRangeCheck = require('ip-range-check');

const verifyIpRange = (allowedRanges) => {
  return (req, res, next) => {
    try {
      let clientIp = req.ip || 
                    req.connection.remoteAddress || 
                    req.socket.remoteAddress ||
                    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                    req.headers['x-real-ip'];

      // Handle IPv6 localhost
      if (clientIp === '::1') {
        clientIp = '127.0.0.1';
      }

      // Handle IPv4 mapped IPv6 addresses
      if (clientIp?.startsWith('::ffff:')) {
        clientIp = clientIp.substring(7);
      }

      if (!clientIp) {
        return res.status(400).json({
          success: false,
          message: 'Unable to determine client IP address.'
        });
      }

      // Store the IP for later use
      req.clientIp = clientIp;

      // Skip IP verification in development mode
      if (process.env.NODE_ENV === 'development') {
        console.log(`Development mode: Skipping IP verification for ${clientIp}`);
        return next();
      }

      // Check if IP is in allowed ranges
      const isAllowed = allowedRanges.some(range => {
        try {
          return ipRangeCheck(clientIp, range);
        } catch (error) {
          console.error(`Invalid IP range format: ${range}`, error);
          return false;
        }
      });

      if (!isAllowed) {
        console.log(`Access denied for IP: ${clientIp}. Allowed ranges: ${allowedRanges.join(', ')}`);
        return res.status(403).json({
          success: false,
          message: 'Access denied. You must be connected to the institution\'s Wi-Fi network.',
          clientIp: process.env.NODE_ENV === 'development' ? clientIp : undefined
        });
      }

      console.log(`IP ${clientIp} verified successfully`);
      next();
    } catch (error) {
      console.error('IP verification error:', error);
      res.status(500).json({
        success: false,
        message: 'Error during IP verification.'
      });
    }
  };
};

const extractClientIp = (req, res, next) => {
  let clientIp = req.ip || 
                req.connection.remoteAddress || 
                req.socket.remoteAddress ||
                req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                req.headers['x-real-ip'];

  // Handle IPv6 localhost
  if (clientIp === '::1') {
    clientIp = '127.0.0.1';
  }

  // Handle IPv4 mapped IPv6 addresses
  if (clientIp?.startsWith('::ffff:')) {
    clientIp = clientIp.substring(7);
  }

  req.clientIp = clientIp || 'unknown';
  next();
};

const verifySessionIp = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const Session = require('../models/Session');
    
    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({
        success: false,
        message: 'Session not found.'
      });
    }

    // Use the session's allowed IP ranges
    const verifyMiddleware = verifyIpRange(session.allowedIpRanges);
    verifyMiddleware(req, res, next);
  } catch (error) {
    console.error('Session IP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during session IP verification.'
    });
  }
};

module.exports = {
  verifyIpRange,
  extractClientIp,
  verifySessionIp
};
