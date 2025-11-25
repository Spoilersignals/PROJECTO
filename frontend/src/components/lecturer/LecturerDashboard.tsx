import React, { useState, useEffect } from 'react';
import { AttendanceSession, AttendanceRecord } from '../../types';
import apiService from '../../services/api';
import Layout from '../common/Layout';
import Button from '../common/Button';
import Input from '../common/Input';
import Modal from '../common/Modal';
import LoadingSpinner from '../common/LoadingSpinner';

interface SessionFormData {
  courseCode: string;
  courseName: string;
  sessionName: string;
  wifiSSID: string;
  allowedRadius: number;
  expiresIn: number; // hours
}

const LecturerDashboard: React.FC = () => {
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<AttendanceSession | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [isCreatingSession, setIsCreatingSession] = useState(false);

  const [formData, setFormData] = useState<SessionFormData>({
    courseCode: '',
    courseName: '',
    sessionName: '',
    wifiSSID: '',
    allowedRadius: 50,
    expiresIn: 2,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const data = await apiService.getSessions();
      setSessions(data);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAttendanceRecords = async (sessionId: string) => {
    try {
      const records = await apiService.getAttendanceRecords(sessionId);
      setAttendanceRecords(Array.isArray(records) ? records : []);
    } catch (error) {
      console.error('Failed to fetch attendance records:', error);
      setAttendanceRecords([]);
    }
  };

  const getCurrentLocation = (): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          reject(new Error('Unable to get location'));
        }
      );
    });
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.courseCode.trim()) errors.courseCode = 'Course code is required';
    if (!formData.courseName.trim()) errors.courseName = 'Course name is required';
    if (!formData.sessionName.trim()) errors.sessionName = 'Session name is required';
    if (!formData.wifiSSID.trim()) errors.wifiSSID = 'Wi-Fi SSID is required';
    if (formData.allowedRadius < 10) errors.allowedRadius = 'Radius must be at least 10 meters';
    if (formData.expiresIn < 0.5) errors.expiresIn = 'Session must be active for at least 30 minutes';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'allowedRadius' || name === 'expiresIn' ? parseFloat(value) || 0 : value
    }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsCreatingSession(true);
    try {
      const location = await getCurrentLocation();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + formData.expiresIn);

      await apiService.createSession({
        ...formData,
        latitude: location.latitude,
        longitude: location.longitude,
        isActive: true,
        expiresAt: expiresAt.toISOString(),
        createdAt: new Date().toISOString(),
      });

      await fetchSessions();
      setShowCreateModal(false);
      setFormData({
        courseCode: '',
        courseName: '',
        sessionName: '',
        wifiSSID: '',
        allowedRadius: 50,
        expiresIn: 2,
      });
      setFormErrors({});
    } catch (error: any) {
      setFormErrors({ general: error.message || 'Failed to create session' });
    } finally {
      setIsCreatingSession(false);
    }
  };

  const handleToggleSession = async (session: AttendanceSession) => {
    try {
      if (session.isActive) {
        await apiService.deactivateSession(session.id);
      } else {
        await apiService.activateSession(session.id);
      }
      await fetchSessions();
    } catch (error) {
      console.error('Failed to toggle session:', error);
    }
  };

  const handleViewAttendance = async (session: AttendanceSession) => {
    setSelectedSession(session);
    await fetchAttendanceRecords(session.id);
  };

  const downloadCSV = () => {
    if (!selectedSession || attendanceRecords.length === 0) return;

    const headers = ['Student Name', 'Registration Number', 'Timestamp', 'Status', 'Minutes Late', 'Session', 'Course'];
    const csvRows = [headers.join(',')];

    attendanceRecords.forEach(record => {
      const row = [
        `"${record.studentName || 'Unknown'}"`,
        `"${record.registrationNumber || record.studentId}"`,
        `"${new Date(record.timestamp).toLocaleString()}"`,
        record.status,
        record.minutesLate || 0,
        `"${selectedSession.sessionName}"`,
        `"${selectedSession.courseCode}"`
      ];
      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_${selectedSession.courseCode}_${selectedSession.sessionName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <Layout title="Lecturer Dashboard">
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Lecturer Dashboard">
      <div className="space-y-6">
        {/* Create Session Button */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">My Attendance Sessions</h2>
          <Button onClick={() => setShowCreateModal(true)}>
            Create New Session
          </Button>
        </div>

        {/* Sessions List */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            {sessions.length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No sessions</h3>
                <p className="mt-1 text-sm text-gray-500">Get started by creating a new attendance session.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {sessions.map((session) => (
                  <div key={session.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">
                          {session.courseName} ({session.courseCode})
                        </h4>
                        <p className="text-sm text-gray-600 mt-1">
                          Session: {session.sessionName}
                        </p>
                        <p className="text-sm text-gray-600">
                          Wi-Fi: {session.wifiSSID}
                        </p>
                        <p className="text-sm text-gray-600">
                          Expires: {new Date(session.expiresAt).toLocaleString()}
                        </p>
                        <div className="mt-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            session.isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {session.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col space-y-2 ml-4">
                        <Button
                          size="sm"
                          variant={session.isActive ? 'danger' : 'secondary'}
                          onClick={() => handleToggleSession(session)}
                        >
                          {session.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewAttendance(session)}
                        >
                          View Attendance
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Session Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New Attendance Session"
        size="lg"
      >
        <form onSubmit={handleCreateSession} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Course Code"
              name="courseCode"
              value={formData.courseCode}
              onChange={handleInputChange}
              error={formErrors.courseCode}
              placeholder="e.g., CS101"
              required
            />
            <Input
              label="Course Name"
              name="courseName"
              value={formData.courseName}
              onChange={handleInputChange}
              error={formErrors.courseName}
              placeholder="e.g., Introduction to Programming"
              required
            />
          </div>

          <Input
            label="Session Name"
            name="sessionName"
            value={formData.sessionName}
            onChange={handleInputChange}
            error={formErrors.sessionName}
            placeholder="e.g., Lecture 1, Lab Session, Quiz"
            required
          />

          <div>
            <Input
              label="Required Wi-Fi Network (SSID)"
              name="wifiSSID"
              value={formData.wifiSSID}
              onChange={handleInputChange}
              error={formErrors.wifiSSID}
              placeholder="e.g., University-WiFi, kabu"
              required
            />
            <div className="mt-1 text-xs text-gray-600 space-y-1">
              <p>📶 The WiFi network name students should connect to</p>
              <p><strong>How to find yours:</strong></p>
              <ul className="ml-4 list-disc">
                <li><strong>Windows:</strong> Click WiFi icon → see connected network</li>
                <li><strong>Mac:</strong> Click WiFi icon → network with checkmark ✓</li>
                <li><strong>Phone:</strong> Settings → WiFi → connected network</li>
              </ul>
              <p className="text-blue-600 font-medium mt-2">ℹ️ Students will see this as a guide. Network connection is verified by IP address.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Allowed Distance (meters)"
              name="allowedRadius"
              type="number"
              value={formData.allowedRadius.toString()}
              onChange={handleInputChange}
              error={formErrors.allowedRadius}
              min="10"
              required
            />
            <Input
              label="Session Duration (hours)"
              name="expiresIn"
              type="number"
              step="0.5"
              value={formData.expiresIn.toString()}
              onChange={handleInputChange}
              error={formErrors.expiresIn}
              min="0.5"
              required
            />
          </div>

          {formErrors.general && (
            <div className="text-red-600 text-sm">
              {formErrors.general}
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <Button
              type="submit"
              isLoading={isCreatingSession}
              className="flex-1"
            >
              Create Session
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCreateModal(false)}
              disabled={isCreatingSession}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Attendance Records Modal */}
      <Modal
        isOpen={!!selectedSession}
        onClose={() => setSelectedSession(null)}
        title={`Attendance - ${selectedSession?.courseName}`}
        size="xl"
      >
        {selectedSession && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 flex justify-between items-center">
              <div>
                <h4 className="font-semibold text-gray-900">
                  {selectedSession.sessionName}
                </h4>
                <p className="text-sm text-gray-600">
                  {selectedSession.courseCode} - {new Date(selectedSession.createdAt).toLocaleString()}
                </p>
              </div>
              {attendanceRecords.length > 0 && (
                <Button onClick={downloadCSV} size="sm">
                  Download CSV
                </Button>
              )}
            </div>

            {attendanceRecords.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No attendance records yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Student Name
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Registration Number
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Timestamp
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {attendanceRecords.map((record) => (
                      <tr key={record.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {record.studentName || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {record.registrationNumber || record.studentId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(record.timestamp).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            record.status === 'present' 
                              ? 'bg-green-100 text-green-800'
                              : record.status === 'late'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {record.status}
                            {record.isLate && record.minutesLate ? ` (${record.minutesLate} min)` : ''}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Modal>
    </Layout>
  );
};

export default LecturerDashboard;
