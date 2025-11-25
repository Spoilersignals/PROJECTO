export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'student' | 'lecturer' | 'admin';
  studentId?: string;
  department?: string;
}

export interface AttendanceSession {
  id: string;
  courseCode: string;
  courseName: string;
  sessionName: string;
  lecturerId: string;
  lecturerName?: string;
  isActive: boolean;
  wifiSSID: string;
  allowedRadius: number;
  latitude: number;
  longitude: number;
  createdAt: string;
  expiresAt: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName?: string;
  registrationNumber?: string;
  sessionId: string;
  timestamp: string;
  markedAt?: string;
  status: 'present' | 'late' | 'absent' | 'excused';
  isLate?: boolean;
  minutesLate?: number;
  courseCode?: string;
  courseName?: string;
  sessionTitle?: string;
  student?: {
    _id: string;
    firstName: string;
    lastName: string;
    registrationNumber: string;
    email: string;
  };
  session?: {
    _id: string;
    title: string;
    startTime: string;
    endTime: string;
    sessionType?: string;
  };
  course?: {
    _id: string;
    name: string;
    code: string;
  };
}

export interface Course {
  id: string;
  courseCode: string; // Kept for compatibility
  courseName: string; // Kept for compatibility
  code: string; // Match backend
  name: string; // Match backend
  description?: string;
  isActive?: boolean;
  lecturerId: string;
  students: User[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: 'student' | 'lecturer';
  registrationNumber?: string;
  employeeId?: string;
  institution?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
  };
}
