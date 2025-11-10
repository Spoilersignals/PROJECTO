require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('Testing email configuration...\n');

// Display current configuration (hiding password)
console.log('Email Settings:');
console.log('- EMAIL_HOST:', process.env.EMAIL_HOST || 'NOT SET');
console.log('- EMAIL_PORT:', process.env.EMAIL_PORT || 'NOT SET');
console.log('- EMAIL_USER:', process.env.EMAIL_USER || 'NOT SET');
console.log('- EMAIL_PASSWORD:', process.env.EMAIL_PASSWORD ? '***SET***' : 'NOT SET');
console.log('- APP_NAME:', process.env.APP_NAME || 'NOT SET');
console.log('\n');

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
  console.error('❌ ERROR: EMAIL_USER or EMAIL_PASSWORD not configured in .env file');
  console.log('\nPlease add to your .env file:');
  console.log('EMAIL_HOST=smtp.gmail.com');
  console.log('EMAIL_PORT=587');
  console.log('EMAIL_USER=your-email@gmail.com');
  console.log('EMAIL_PASSWORD=your-app-password');
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  },
  debug: true,
  logger: true
});

async function testEmail() {
  try {
    console.log('Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection successful!\n');

    console.log('Sending test email...');
    const testCode = '123456';
    const info = await transporter.sendMail({
      from: `"${process.env.APP_NAME || 'Attendance System'}" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // Send to yourself for testing
      subject: 'Test Email - Email Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Email Verification Test</h2>
          <p>Hi,</p>
          <p>This is a test email to verify your SMTP configuration is working correctly.</p>
          <div style="background-color: #f4f4f4; padding: 15px; text-align: center; margin: 20px 0;">
            <h1 style="color: #333; margin: 0; letter-spacing: 5px;">${testCode}</h1>
          </div>
          <p>If you received this email, your email service is configured correctly! ✅</p>
        </div>
      `
    });

    console.log('✅ Test email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log(`\nCheck your inbox at: ${process.env.EMAIL_USER}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Email test failed:');
    console.error('Error:', error.message);
    
    if (error.code === 'EAUTH') {
      console.log('\n⚠️  Authentication failed. Common solutions:');
      console.log('1. For Gmail: Use an App Password, not your regular password');
      console.log('   - Go to: https://myaccount.google.com/apppasswords');
      console.log('   - Enable 2-Factor Authentication first');
      console.log('   - Generate an app password for "Mail"');
      console.log('2. Make sure EMAIL_USER matches the email account');
    } else if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
      console.log('\n⚠️  Connection failed. Check:');
      console.log('1. Internet connection');
      console.log('2. EMAIL_HOST and EMAIL_PORT are correct');
      console.log('3. Firewall/antivirus not blocking port 587');
    }
    
    process.exit(1);
  }
}

testEmail();
