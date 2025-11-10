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

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

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
    const response: AxiosResponse<AuthResponse> = await this.api.post('/auth/login', credentials);
    return response.data;
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response: AxiosResponse<AuthResponse> = await this.api.post('/auth/register', userData);
    return response.data;
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
    const response: AxiosResponse<User> = await this.api.get('/auth/profile');
    return response.data;
  }

  async getAllUsers(): Promise<User[]> {
    const response: AxiosResponse<User[]> = await this.api.get('/users');
    return response.data;
  }

  // Attendance Session endpoints
  async createSession(sessionData: Partial<AttendanceSession>): Promise<AttendanceSession> {
    const response: AxiosResponse<any> = await this.api.post('/sessions/simple', sessionData);
    return response.data.data?.session || response.data.session || response.data;
  }

  async getSessions(): Promise<AttendanceSession[]> {
    const response: AxiosResponse<any> = await this.api.get('/sessions');
    return response.data.data?.sessions || response.data.sessions || response.data;
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
    const response: AxiosResponse<AttendanceSession> = await this.api.post(`/sessions/${id}/activate`);
    return response.data;
  }

  async deactivateSession(id: string): Promise<AttendanceSession> {
    const response: AxiosResponse<AttendanceSession> = await this.api.post(`/sessions/${id}/deactivate`);
    return response.data;
  }

  // Attendance endpoints
  async markAttendance(sessionId: string, location?: { latitude: number; longitude: number }, wifiSSID?: string): Promise<AttendanceRecord> {
    const response: AxiosResponse<any> = await this.api.post(`/attendance/${sessionId}`, { 
      location,
      wifiSSID 
    });
    return response.data.data?.attendance || response.data.attendance || response.data;
  }

  async getAttendanceRecords(sessionId: string): Promise<AttendanceRecord[]> {
    const response: AxiosResponse<any> = await this.api.get(`/sessions/${sessionId}/attendance`);
    return response.data.data?.records || response.data.records || response.data;
  }

  async getStudentAttendance(studentId?: string): Promise<AttendanceRecord[]> {
    const endpoint = studentId ? `/attendance/student/${studentId}` : '/attendance/my';
    const response: AxiosResponse<any> = await this.api.get(endpoint);
    return response.data.data?.records || response.data.records || response.data;
  }

  // Course endpoints
  async getCourses(): Promise<Course[]> {
    const response: AxiosResponse<any> = await this.api.get('/courses');
    return response.data.data?.courses || response.data.courses || response.data;
  }

  async createCourse(courseData: Partial<Course>): Promise<Course> {
    const response: AxiosResponse<Course> = await this.api.post('/courses', courseData);
    return response.data;
  }
}

const apiService = new ApiService();
export default apiService;
