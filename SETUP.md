# Smart Wi-Fi Bound Attendance System - Setup Guide

## 📋 Prerequisites

- Node.js (v16 or higher)
- MongoDB (local installation or cloud service like MongoDB Atlas)
- Git (for version control)

## 🚀 Quick Start

### 1. Environment Setup

#### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
```

Edit the `.env` file with your configuration:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/attendance-system
JWT_SECRET=your-super-secret-jwt-key-here
JWT_REFRESH_SECRET=your-super-secret-refresh-key-here
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_ROUNDS=12
```

#### Frontend Setup
```bash
cd frontend
npm install
```

### 2. Database Setup

#### Option A: Local MongoDB
1. Install MongoDB on your system
2. Start MongoDB service:
   ```bash
   mongod
   ```

#### Option B: MongoDB Atlas (Cloud)
1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a new cluster
3. Get connection string and update `MONGODB_URI` in `.env`

### 3. Start Development Servers

#### Backend Server
```bash
cd backend
npm run dev
```
Server will run on `http://localhost:5000`

#### Frontend Server
```bash
cd frontend
npm start
```
Application will run on `http://localhost:3000`

## 🏫 Initial System Configuration

### 1. Create Admin Account

First, register an admin user via the API:

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@university.edu",
    "password": "AdminPass123!",
    "firstName": "System",
    "lastName": "Administrator",
    "role": "admin"
  }'
```

### 2. Set Up Institution

Create your institution with Wi-Fi IP ranges:

```bash
curl -X POST http://localhost:5000/api/institutions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "name": "Your University",
    "code": "YU",
    "ipRanges": [
      "192.168.1.0/24",
      "10.0.0.0/8"
    ],
    "allowedSSIDs": ["University_WiFi", "Campus_Net"],
    "settings": {
      "sessionDuration": 3,
      "bufferTime": 1,
      "maxAttendanceRadius": 100
    }
  }'
```

### 3. Create Sample Users

#### Lecturer
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "lecturer@university.edu",
    "password": "LecturerPass123!",
    "firstName": "John",
    "lastName": "Professor",
    "role": "lecturer",
    "employeeId": "EMP001"
  }'
```

#### Student
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@university.edu",
    "password": "StudentPass123!",
    "firstName": "Jane",
    "lastName": "Student",
    "role": "student",
    "registrationNumber": "2023001"
  }'
```

## 🔧 Configuration Details

### Wi-Fi IP Range Configuration

Update your institution's IP ranges to match your network:

```javascript
// Common formats:
"192.168.1.0/24"     // Single subnet
"10.0.0.0/8"         // Large network range  
"172.16.0.0/12"      // Private network range
```

### Session Settings

Configure attendance session parameters:

```javascript
{
  "sessionDuration": 3,      // Minutes for attendance window
  "bufferTime": 1,           // Minutes before session starts
  "maxAttendanceRadius": 100 // Meters for location verification
}
```

## 📱 Using the System

### For Lecturers:
1. Log in to the lecturer dashboard
2. Create courses and enroll students
3. Start attendance sessions for classes
4. Monitor real-time attendance
5. Download attendance reports

### For Students:
1. Connect to institutional Wi-Fi
2. Log in to the student portal
3. Mark attendance during active sessions
4. View attendance history

### For Admins:
1. Manage users and roles
2. Configure institution settings
3. Monitor system usage
4. Generate comprehensive reports

## 🔒 Security Considerations

### Production Deployment:
1. Use strong, unique JWT secrets
2. Enable HTTPS with SSL certificates
3. Configure firewall rules for database access
4. Set up regular database backups
5. Monitor API usage and implement rate limiting
6. Use environment variables for all secrets

### Wi-Fi Security:
1. Ensure institutional Wi-Fi is WPA2/WPA3 encrypted
2. Regularly update IP range configurations
3. Monitor for suspicious access patterns
4. Implement network access controls

## 🚀 Deployment Options

### Heroku Deployment
```bash
# Install Heroku CLI
# Create Heroku apps
heroku create attendance-backend
heroku create attendance-frontend

# Set environment variables
heroku config:set NODE_ENV=production -a attendance-backend
heroku config:set MONGODB_URI=your-mongodb-atlas-uri -a attendance-backend

# Deploy
git push heroku main
```

### AWS/DigitalOcean Deployment
1. Set up VPS with Node.js and MongoDB
2. Configure reverse proxy (Nginx)
3. Set up SSL certificates (Let's Encrypt)
4. Configure process manager (PM2)
5. Set up monitoring and backups

## 🐛 Troubleshooting

### Common Issues:

#### MongoDB Connection Error
```
Error: connect ECONNREFUSED 127.0.0.1:27017
```
**Solution**: Ensure MongoDB is running or check connection string

#### JWT Token Issues
```
Error: jwt malformed
```
**Solution**: Check JWT secret configuration and token format

#### CORS Errors
```
Access to fetch blocked by CORS policy
```
**Solution**: Verify backend CORS configuration includes frontend URL

#### IP Range Verification Failing
```
Error: Not connected to authorized network
```
**Solution**: Update institution IP ranges to match actual network configuration

## 📞 Support

For technical issues:
1. Check server logs: `npm run logs`
2. Verify environment configuration
3. Test API endpoints with curl or Postman
4. Check database connectivity and data

## 📈 Monitoring

### Key Metrics to Track:
- Active sessions per day
- Attendance completion rates
- Failed authentication attempts
- IP verification failures
- System response times

### Log Files:
- Backend logs: `backend/logs/`
- Error tracking: Monitor console outputs
- Database queries: Enable MongoDB slow query log

---

Your Smart Wi-Fi Bound Attendance System is now ready for deployment and use!
