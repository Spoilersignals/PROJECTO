import React, { useState, useEffect } from 'react';
import { AttendanceSession, AttendanceRecord } from '../../types';
import apiService from '../../services/api';
import Layout from '../common/Layout';
import Button from '../common/Button';
import LoadingSpinner from '../common/LoadingSpinner';
import Modal from '../common/Modal';

const StudentDashboard: React.FC = () => {
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [myAttendance, setMyAttendance] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAttendance, setIsMarkingAttendance] = useState(false);
  const [selectedSession, setSelectedSession] = useState<AttendanceSession | null>(null);
  const [locationError, setLocationError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [sessionsData, attendanceData] = await Promise.all([
        apiService.getSessions(),
        apiService.getStudentAttendance()
      ]);
      setSessions(Array.isArray(sessionsData) ? sessionsData.filter(session => session.isActive) : []);
      setMyAttendance(Array.isArray(attendanceData) ? attendanceData : []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
      setSessions([]);
      setMyAttendance([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentLocation = (): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
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
          reject(new Error('Unable to retrieve your location'));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5 minutes
        }
      );
    });
  };

  const handleMarkAttendance = async (session: AttendanceSession) => {
    setIsMarkingAttendance(true);
    setLocationError('');

    try {
      const location = await getCurrentLocation();
      await apiService.markAttendance(session.id, location);
      
      // Refresh data
      await fetchData();
      setSelectedSession(null);
      
      // Show success message
      alert('Attendance marked successfully!');
    } catch (error: any) {
      setLocationError(error.response?.data?.message || error.message || 'Failed to mark attendance');
    } finally {
      setIsMarkingAttendance(false);
    }
  };

  const isAttendanceMarked = (sessionId: string) => {
    return myAttendance.some(record => record.sessionId === sessionId);
  };

  if (isLoading) {
    return (
      <Layout title="Student Dashboard">
        <div className="flex justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Student Dashboard">
      <div className="space-y-6">
        {/* Active Sessions */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Active Attendance Sessions
            </h3>
            {sessions.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No active attendance sessions at the moment
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {sessions.map((session) => (
                  <div key={session.id} className="border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">
                      {session.courseName}
                    </h4>
                    <p className="text-sm text-gray-600 mb-1">
                      Course: {session.courseCode}
                    </p>
                    <p className="text-sm text-gray-600 mb-1">
                      Session: {session.sessionName}
                    </p>
                    <p className="text-sm text-blue-600 mb-1 flex items-center">
                      <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      Physical presence required
                    </p>
                    <p className="text-sm text-gray-600 mb-3">
                      Expires: {new Date(session.expiresAt).toLocaleString()}
                    </p>
                    
                    {isAttendanceMarked(session.id) ? (
                      <div className="flex items-center">
                        <svg className="h-5 w-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-green-600 font-medium">Attended</span>
                      </div>
                    ) : (
                      <Button
                        onClick={() => setSelectedSession(session)}
                        className="w-full"
                        size="sm"
                      >
                        Mark Attendance
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Attendance History */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              My Attendance History
            </h3>
            {myAttendance.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No attendance records yet
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date & Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Session
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {myAttendance.slice(0, 10).map((record) => (
                      <tr key={record.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(record.timestamp).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {/* You might want to fetch session details here */}
                          Session {record.sessionId.slice(0, 8)}
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
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mark Attendance Modal */}
      <Modal
        isOpen={!!selectedSession}
        onClose={() => setSelectedSession(null)}
        title="Mark Attendance"
      >
        {selectedSession && (
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold text-gray-900">
                {selectedSession.courseName}
              </h4>
              <p className="text-sm text-gray-600">
                {selectedSession.courseCode} - {selectedSession.sessionName}
              </p>
            </div>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex">
                <svg className="h-5 w-5 text-yellow-400 mr-3" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    Make sure you are connected to the correct Wi-Fi network and within the required location range.
                  </p>
                </div>
              </div>
            </div>

            {locationError && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <p className="text-sm text-red-700">{locationError}</p>
              </div>
            )}

            <div className="flex space-x-3 pt-4">
              <Button
                onClick={() => handleMarkAttendance(selectedSession)}
                isLoading={isMarkingAttendance}
                className="flex-1"
              >
                Confirm Attendance
              </Button>
              <Button
                onClick={() => setSelectedSession(null)}
                variant="outline"
                disabled={isMarkingAttendance}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  );
};

export default StudentDashboard;
