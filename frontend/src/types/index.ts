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
  sessionId: string;
  timestamp: string;
  status: 'present' | 'late' | 'absent';
}

export interface Course {
  id: string;
  courseCode: string;
  courseName: string;
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
  studentId?: string;
  department?: string;
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
