# Smart Wi-Fi Bound Attendance System - Backend API

A comprehensive Node.js/Express backend API for managing attendance through Wi-Fi IP verification with role-based access control.

## Features

- **Authentication & Authorization**: JWT-based auth with refresh tokens
- **Role Management**: Admin, Lecturer, and Student roles with appropriate permissions
- **Wi-Fi IP Verification**: Automatic location-based attendance verification
- **Session Management**: Create, manage, and track attendance sessions
- **Real-time Attendance**: Live attendance marking with duplicate prevention
- **Report Generation**: Excel and PDF export capabilities
- **Course Management**: Full course and student enrollment management
- **Institution Management**: Multi-institution support with IP range configuration
- **Security**: Rate limiting, input validation, and secure headers

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JSON Web Tokens (JWT)
- **Security**: Helmet, CORS, Rate limiting, bcrypt
- **File Generation**: XLSX (Excel), PDFKit (PDF)
- **Validation**: Joi, Express-validator
- **IP Verification**: ip-range-check

## Project Structure

```
backend/
├── config/
│   └── database.js          # MongoDB connection
├── controllers/             # Route controllers (if needed)
├── middleware/
│   ├── auth.js             # Authentication middleware
│   ├── ipVerification.js   # IP verification middleware
│   ├── validation.js       # Input validation middleware
│   └── errorHandler.js     # Global error handling
├── models/
│   ├── User.js             # User schema and model
│   ├── Institution.js      # Institution schema
│   ├── Course.js           # Course schema
│   ├── Session.js          # Session schema
│   └── Attendance.js       # Attendance schema
├── routes/
│   ├── auth.js             # Authentication routes
│   ├── users.js            # User management routes
│   ├── institutions.js     # Institution routes
│   ├── courses.js          # Course management routes
│   ├── sessions.js         # Session management routes
│   ├── attendance.js       # Attendance routes
│   └── reports.js          # Report generation routes
├── utils/
│   ├── constants.js        # App constants and enums
│   └── helpers.js          # Utility functions
├── .env.example            # Environment variables template
├── .gitignore              # Git ignore rules
├── package.json            # Dependencies and scripts
├── server.js               # Main server file
└── README.md               # This file
```

## Installation & Setup

1. **Clone and Navigate**:
   ```bash
   cd backend
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Environment Configuration**:
   ```bash
   cp .env.example .env
   ```
   
   Update the `.env` file with your configuration:
   ```env
   MONGODB_URI=mongodb://localhost:27017/smart-attendance
   JWT_SECRET=your-super-secret-jwt-key-here
   JWT_REFRESH_SECRET=your-super-secret-refresh-key-here
   PORT=5000
   FRONTEND_URL=http://localhost:3000
   ALLOWED_IP_RANGES=192.168.1.0/24,10.0.0.0/8
   ```

4. **Start MongoDB** (ensure MongoDB is running)

5. **Run the Application**:
   ```bash
   # Development with auto-reload
   npm run dev
   
   # Production
   npm start
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - User logout
- `GET /api/auth/me` - Get current user info
- `PUT /api/auth/change-password` - Change password

### Users
- `GET /api/users` - List users (Admin)
- `GET /api/users/:id` - Get user details
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Deactivate/Delete user (Admin)
- `POST /api/users/:id/activate` - Activate user (Admin)
- `POST /api/users/:userId/enroll/:courseId` - Enroll student
- `DELETE /api/users/:userId/unenroll/:courseId` - Unenroll student

### Institutions
- `POST /api/institutions` - Create institution (Admin)
- `GET /api/institutions` - List institutions (Admin)
- `GET /api/institutions/list` - Simple institution list (Public)
- `GET /api/institutions/:id` - Get institution details (Admin)
- `PUT /api/institutions/:id` - Update institution (Admin)
- `DELETE /api/institutions/:id` - Delete institution (Admin)

### Courses
- `POST /api/courses` - Create course (Admin)
- `GET /api/courses` - List courses
- `GET /api/courses/:id` - Get course details
- `PUT /api/courses/:id` - Update course
- `DELETE /api/courses/:id` - Delete course (Admin)
- `POST /api/courses/:id/enroll` - Bulk enroll students
- `GET /api/courses/:id/sessions` - Get course sessions
- `GET /api/courses/:id/students` - Get enrolled students

### Sessions
- `POST /api/sessions` - Create session (Lecturer/Admin)
- `GET /api/sessions` - List sessions
- `GET /api/sessions/:id` - Get session details
- `PUT /api/sessions/:id` - Update session
- `POST /api/sessions/:id/start` - Start session
- `POST /api/sessions/:id/end` - End session
- `DELETE /api/sessions/:id` - Cancel/Delete session
- `GET /api/sessions/:id/attendance` - Get session attendance

### Attendance
- `POST /api/attendance/:sessionId` - Mark attendance (Student)
- `GET /api/attendance/my` - Get my attendance (Student)
- `GET /api/attendance/course/:courseId` - Get course attendance
- `PUT /api/attendance/:id` - Update attendance record
- `DELETE /api/attendance/:id` - Delete attendance (Admin)
- `GET /api/attendance/student/:studentId` - Get student attendance
- `GET /api/attendance/check/:sessionId` - Check attendance eligibility

### Reports
- `GET /api/reports/attendance/excel` - Generate Excel attendance report
- `GET /api/reports/attendance/pdf` - Generate PDF attendance report
- `GET /api/reports/session/:sessionId/excel` - Session-specific Excel report
- `GET /api/reports/course/:courseId/summary` - Course summary report
- `GET /api/reports/statistics` - General statistics (Admin)

### Health Check
- `GET /api/health` - Health check endpoint

## Wi-Fi IP Verification

The system uses IP range verification to ensure students are physically present:

1. **IP Range Configuration**: Set allowed IP ranges for each institution
2. **Automatic Verification**: Middleware checks client IP against allowed ranges
3. **Development Mode**: IP verification is bypassed in development mode
4. **Flexible Configuration**: Support for multiple IP ranges and CIDR notation

## Authentication Flow

1. **Registration**: Users register with email, password, and role-specific info
2. **Login**: Returns access token (1 hour) and refresh token (7 days)
3. **Token Refresh**: Use refresh token to get new access token
4. **Role-based Access**: Middleware checks user roles for protected routes
5. **Session Management**: Multiple device login support with token cleanup

## Security Features

- **Password Hashing**: bcrypt with salt rounds
- **JWT Tokens**: Secure token-based authentication
- **Rate Limiting**: Prevent brute force attacks
- **Input Validation**: Comprehensive validation on all inputs
- **CORS Configuration**: Controlled cross-origin access
- **Security Headers**: Helmet.js for security headers
- **IP Verification**: Location-based access control
- **SQL Injection Protection**: MongoDB parameterized queries

## Error Handling

- **Global Error Handler**: Centralized error processing
- **Validation Errors**: Detailed field-level validation feedback
- **HTTP Status Codes**: Proper status codes for all responses
- **Error Logging**: Comprehensive error logging
- **User-friendly Messages**: Clear error messages for clients

## Data Models

### User
- Personal information, role, authentication data
- Institution association and course enrollment
- Refresh token management

### Institution
- Institution details and IP range configuration
- Settings for session duration and attendance rules

### Course
- Course information, lecturer assignment, student enrollment
- Schedule configuration and academic year tracking

### Session
- Session details, timing, and attendance windows
- IP range verification and status tracking
- Lecturer controls and metadata

### Attendance
- Attendance records with timestamp and IP verification
- Status tracking (present, late, excused)
- Device information and location data

## Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Start production server
npm start

# Run tests (if configured)
npm test
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/smart-attendance` |
| `JWT_SECRET` | Secret for access tokens | Required |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens | Required |
| `JWT_EXPIRE` | Access token expiry | `1h` |
| `JWT_REFRESH_EXPIRE` | Refresh token expiry | `7d` |
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment mode | `development` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:3000` |
| `ALLOWED_IP_RANGES` | Default IP ranges | `192.168.1.0/24,10.0.0.0/8` |
| `RATE_LIMIT_WINDOW_MS` | Rate limit window | `900000` (15 min) |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per window | `100` |

## Production Deployment

1. **Environment Setup**: Configure production environment variables
2. **Database**: Set up MongoDB instance (local or cloud)
3. **Process Manager**: Use PM2 or similar for process management
4. **Reverse Proxy**: Configure nginx or similar
5. **SSL Certificate**: Enable HTTPS for production
6. **Monitoring**: Set up logging and monitoring
7. **Backup**: Configure database backup strategy

## API Response Format

All API responses follow this structure:

```json
{
  "success": true|false,
  "message": "Response message",
  "data": {
    // Response data
  },
  "errors": [
    // Validation errors (if any)
  ]
}
```

## Testing

The system includes comprehensive error handling and validation, but for production deployment, consider adding:

- Unit tests for business logic
- Integration tests for API endpoints
- Load testing for performance
- Security testing for vulnerabilities

## Support

For issues or questions, please refer to the documentation or create an issue in the project repository.
