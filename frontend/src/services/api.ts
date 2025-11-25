import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { 
  User, 
  AttendanceSession, 
  AttendanceRecord, 
  Course, 
  LoginRequest, 
  RegisterRequest, 
  AuthResponse 
} from '../types';

import { getDeviceId } from '../utils/device';

// Map backend session to frontend AttendanceSession
const mapSession = (s: any): AttendanceSession => ({
  id: s._id || s.id,
  courseCode: s.course?.code || s.courseCode || '',
  courseName: s.course?.name || s.courseName || '',
  sessionName: s.title || s.sessionName || '',
  lecturerId: s.lecturer?._id || s.lecturer || '',
  lecturerName: s.lecturer?.firstName && s.lecturer?.lastName 
    ? `${s.lecturer.firstName} ${s.lecturer.lastName}` 
    : undefined,
  wifiSSID: s.wifiSSID || '',
  allowedRadius: s.allowedRadius || 50,
  latitude: s.location?.latitude ?? s.latitude ?? 0,
  longitude: s.location?.longitude ?? s.longitude ?? 0,
  isActive: s.status === 'active',
  expiresAt: s.endTime || s.expiresAt || new Date().toISOString(),
  createdAt: s.startTime || s.createdAt || new Date().toISOString(),
});

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
      timeout: 60000, // Increased to 60s for mobile uploads
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('API Service initialized with Base URL:', this.api.defaults.baseURL);


    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const deviceId = getDeviceId();
    const response: AxiosResponse<AuthResponse> = await this.api.post('/auth/login', {
      ...credentials,
      deviceId
    });
    return response.data;
  }

  async register(userData: RegisterRequest | FormData): Promise<AuthResponse> {
    const deviceId = getDeviceId();
    const config = {
      headers: userData instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined
    };

    if (userData instanceof FormData) {
      userData.append('deviceId', deviceId);
      const response: AxiosResponse<AuthResponse> = await this.api.post('/auth/register', userData, config);
      return response.data;
    } else {
      const response: AxiosResponse<AuthResponse> = await this.api.post('/auth/register', {
        ...userData,
        deviceId
      }, config);
      return response.data;
    }
  }

  async verifyEmail(email: string, verificationCode: string): Promise<AuthResponse> {
    const response: AxiosResponse<AuthResponse> = await this.api.post('/auth/verify-email', {
      email,
      verificationCode
    });
    return response.data;
  }

  async resendVerification(email: string): Promise<void> {
    await this.api.post('/auth/resend-verification', { email });
  }

  async logout(): Promise<void> {
    await this.api.post('/auth/logout');
  }

  // User endpoints
  async getProfile(): Promise<User> {
    const response: AxiosResponse<User> = await this.api.get('/auth/me');
    return response.data;
  }

  async getAllUsers(): Promise<User[]> {
    const response: AxiosResponse<User[]> = await this.api.get('/users');
    return response.data;
  }

  // Attendance Session endpoints
  async createSession(sessionData: Partial<AttendanceSession>): Promise<AttendanceSession> {
    const response: AxiosResponse<any> = await this.api.post('/sessions/simple', sessionData);
    const raw = response.data.data?.session || response.data.session || response.data;
    return mapSession(raw);
  }

  async getSessions(): Promise<AttendanceSession[]> {
    const response: AxiosResponse<any> = await this.api.get('/sessions');
    const raw = response.data.data?.sessions || response.data.sessions || response.data;
    return Array.isArray(raw) ? raw.map(mapSession) : [];
  }

  async getSession(id: string): Promise<AttendanceSession> {
    const response: AxiosResponse<AttendanceSession> = await this.api.get(`/sessions/${id}`);
    return response.data;
  }

  async updateSession(id: string, sessionData: Partial<AttendanceSession>): Promise<AttendanceSession> {
    const response: AxiosResponse<AttendanceSession> = await this.api.put(`/sessions/${id}`, sessionData);
    return response.data;
  }

  async deleteSession(id: string): Promise<void> {
    await this.api.delete(`/sessions/${id}`);
  }

  async activateSession(id: string): Promise<AttendanceSession> {
    const response: AxiosResponse<any> = await this.api.post(`/sessions/${id}/start`);
    const raw = response.data.data?.session || response.data.session || response.data;
    return mapSession(raw);
  }

  async deactivateSession(id: string): Promise<AttendanceSession> {
    const response: AxiosResponse<any> = await this.api.post(`/sessions/${id}/deactivate`);
    const raw = response.data.data?.session || response.data.session || response.data;
    return mapSession(raw);
  }

  // Attendance endpoints
  async markAttendance(sessionId: string, location?: { latitude: number; longitude: number }, wifiSSID?: string, imageFile?: File): Promise<AttendanceRecord> {
    const deviceId = getDeviceId();
    
    if (imageFile) {
      const formData = new FormData();
      if (location) {
        formData.append('location', JSON.stringify(location));
      }
      if (wifiSSID) {
        formData.append('wifiSSID', wifiSSID);
      }
      formData.append('deviceId', deviceId);
      formData.append('image', imageFile);
      
      const response: AxiosResponse<any> = await this.api.post(`/attendance/${sessionId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data.data?.attendance || response.data.attendance || response.data;
    } else {
      const response: AxiosResponse<any> = await this.api.post(`/attendance/${sessionId}`, { 
        location,
        wifiSSID,
        deviceId
      });
      return response.data.data?.attendance || response.data.attendance || response.data;
    }
  }

  async getAttendanceRecords(sessionId: string): Promise<AttendanceRecord[]> {
    const response: AxiosResponse<any> = await this.api.get(`/sessions/${sessionId}/attendance`);
    const raw = response.data.data?.attendance || response.data.attendance || [];
    
    // Map backend attendance records to frontend format
    return Array.isArray(raw) ? raw.map((record: any) => ({
      id: record._id || record.id,
      studentId: record.student?._id || record.student || '',
      studentName: record.student ? `${record.student.firstName} ${record.student.lastName}` : '',
      registrationNumber: record.student?.registrationNumber || '',
      sessionId: record.session?._id || record.session || sessionId,
      timestamp: record.markedAt || record.timestamp || '',
      markedAt: record.markedAt,
      status: record.status || 'present',
      isLate: record.isLate,
      minutesLate: record.minutesLate,
      student: record.student
    })) : [];
  }

  async getStudentAttendance(studentId?: string): Promise<AttendanceRecord[]> {
    const endpoint = studentId ? `/attendance/student/${studentId}` : '/attendance/my';
    const response: AxiosResponse<any> = await this.api.get(endpoint);
    const raw = response.data.data?.attendance || response.data.attendance || response.data.data?.records || response.data.records || response.data;
    
    // Map backend attendance records to frontend format
    return Array.isArray(raw) ? raw.map((record: any) => ({
      id: record._id || record.id,
      studentId: record.student?._id || record.student || '',
      studentName: record.student ? `${record.student.firstName} ${record.student.lastName}` : '',
      registrationNumber: record.student?.registrationNumber || '',
      sessionId: record.session?._id || record.session || '',
      timestamp: record.markedAt || record.timestamp || '',
      markedAt: record.markedAt,
      status: record.status || 'present',
      isLate: record.isLate,
      minutesLate: record.minutesLate,
      courseCode: record.courseCode || record.course?.code || '',
      courseName: record.courseName || record.course?.name || '',
      sessionTitle: record.session?.title || '',
      student: record.student,
      session: record.session,
      course: record.course
    })) : [];
  }

  // Course endpoints
  async getCourses(): Promise<Course[]> {
    const response: AxiosResponse<any> = await this.api.get('/courses');
    const rawCourses = response.data.data?.courses || response.data.courses || response.data;
    
    if (!Array.isArray(rawCourses)) return [];

    return rawCourses.map((course: any) => ({
      ...course,
      id: course._id || course.id,
      code: course.code || course.courseCode || '',
      name: course.name || course.courseName || '',
    }));
  }

  async createCourse(courseData: Partial<Course>): Promise<Course> {
    const response: AxiosResponse<Course> = await this.api.post('/courses', courseData);
    return response.data;
  }
}

const apiService = new ApiService();
export default apiService;
