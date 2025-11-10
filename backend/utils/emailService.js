const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

const generateVerificationCode = () => {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  console.log('Generated verification code:', code);
  return code;
};

const sendVerificationEmail = async (email, verificationCode, firstName) => {
  try {
    const mailOptions = {
      from: `"${process.env.APP_NAME || 'Attendance System'}" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Email Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Email Verification</h2>
          <p>Hi ${firstName},</p>
          <p>Thank you for registering. Please use the verification code below to verify your email address:</p>
          <div style="background-color: #f4f4f4; padding: 15px; text-align: center; margin: 20px 0;">
            <h1 style="color: #333; margin: 0; letter-spacing: 5px;">${verificationCode}</h1>
          </div>
          <p>This code will expire in 1 hour.</p>
          <p>If you didn't create an account, please ignore this email.</p>
          <hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;">
          <p style="color: #888; font-size: 12px;">This is an automated message, please do not reply.</p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Verification email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending verification email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  generateVerificationCode,
  sendVerificationEmail
};
