import React, { useState, useEffect } from 'react';
import { AttendanceSession, AttendanceRecord } from '../../types';
import apiService from '../../services/api';
import Layout from '../common/Layout';
import Button from '../common/Button';
import LoadingSpinner from '../common/LoadingSpinner';
import Modal from '../common/Modal';
import CameraCapture from '../common/CameraCapture';
import { getDeviceName } from '../../utils/device';

import { Link } from 'react-router-dom';

const COLORS = ['bg-green-500', 'bg-blue-500', 'bg-purple-500', 'bg-indigo-500'];

const VisualVerification: React.FC<{ 
  record: AttendanceRecord | null, 
  onClose: () => void 
}> = ({ record, onClose }) => {
  const [time, setTime] = useState(new Date());
  const [colorIndex, setColorIndex] = useState(0);
  
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    const colorTimer = setInterval(() => setColorIndex(prev => (prev + 1) % COLORS.length), 3000);
    return () => {
      clearInterval(timer);
      clearInterval(colorTimer);
    };
  }, []);

  if (!record) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center p-4">
      <div className={`w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col h-full max-h-[80vh] ${COLORS[colorIndex]} transition-colors duration-1000`}>
        <div className="p-6 text-white text-center flex-1 flex flex-col justify-center items-center">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-6 animate-bounce">
            <svg className="w-16 h-16 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h2 className="text-3xl font-bold mb-2">ATTENDANCE MARKED</h2>
          <div className="text-6xl font-mono font-bold mb-4 tracking-wider">
            {time.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          
          <div className="bg-white/20 backdrop-blur-md rounded-xl p-6 w-full mb-6">
            <p className="text-xl font-semibold mb-1">{record.studentName || 'Student'}</p>
            <p className="text-lg opacity-90 mb-4">{record.registrationNumber}</p>
            <div className="border-t border-white/30 my-2"></div>
            <p className="text-lg font-medium mt-2">{record.courseCode}</p>
            <p className="text-sm opacity-90">{record.sessionTitle}</p>
          </div>

          <div className="animate-pulse flex items-center space-x-2 bg-black/20 px-4 py-2 rounded-full">
             <div className="w-3 h-3 bg-red-500 rounded-full"></div>
             <span className="text-sm font-medium">LIVE VERIFICATION</span>
          </div>
        </div>
        
        <div className="bg-white p-4">
          <Button onClick={onClose} className="w-full text-lg py-4" size="lg">
            Close Verification
          </Button>
        </div>
      </div>
    </div>
  );
};

const StudentDashboard: React.FC = () => {
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [myAttendance, setMyAttendance] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAttendance, setIsMarkingAttendance] = useState(false);
  const [selectedSession, setSelectedSession] = useState<AttendanceSession | null>(null);
  const [locationError, setLocationError] = useState('');
  const [currentWifiSSID, setCurrentWifiSSID] = useState('');
  const [verificationRecord, setVerificationRecord] = useState<AttendanceRecord | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [pendingSession, setPendingSession] = useState<AttendanceSession | null>(null);
  const [capturedLocation, setCapturedLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [sessionsData, attendanceData] = await Promise.all([
        apiService.getSessions(),
        apiService.getStudentAttendance()
      ]);
      // Backend now filters for active, non-expired sessions for students
      setSessions(Array.isArray(sessionsData) ? sessionsData : []);
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

  const initiateAttendance = async (session: AttendanceSession) => {
    setIsMarkingAttendance(true);
    setLocationError('');

    try {
      // 1. Get location first
      const location = await getCurrentLocation();
      setCapturedLocation(location);
      
      // 2. Move to camera step
      setPendingSession(session);
      setSelectedSession(null); // Close the first modal
      setIsMarkingAttendance(false);
      setShowCamera(true);
    } catch (error: any) {
      setLocationError(error.message || 'Failed to retrieve location');
      setIsMarkingAttendance(false);
    }
  };

  const handlePhotoCapture = async (file: File) => {
    if (!pendingSession || !capturedLocation) {
       console.error('Missing session or location data during capture');
       return;
    }
    
    setIsMarkingAttendance(true);
    setUploadProgress(0);
    setStatusMessage('Initializing upload...');

    try {
      // 3. Send everything to backend
      setStatusMessage('Uploading verification image...');
      
      const record = await apiService.markAttendance(
        pendingSession.id, 
        capturedLocation, 
        currentWifiSSID || undefined,
        file,
        (progress) => {
          setUploadProgress(progress);
          if (progress === 100) {
            setStatusMessage('Verifying face biometric data...');
          } else {
            setStatusMessage(`Uploading... ${progress}%`);
          }
        }
      );
      
      setStatusMessage('Attendance marked successfully!');
      setUploadProgress(100);
      
      // 4. Success!
      await fetchData();
      setShowCamera(false);
      setPendingSession(null);
      setCurrentWifiSSID('');
      setCapturedLocation(null);
      
      // Show verification screen
      setVerificationRecord(record);
    } catch (error: any) {
      // If it fails, go back to initial state but show error?
      // Or just close camera and show alert
      setShowCamera(false);
      alert(error.response?.data?.message || error.message || 'Failed to mark attendance');
    } finally {
      setIsMarkingAttendance(false);
    }
  };

  const handleCameraCancel = () => {
    setShowCamera(false);
    setPendingSession(null);
    setIsMarkingAttendance(false);
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
      {verificationRecord && (
        <VisualVerification 
          record={verificationRecord} 
          onClose={() => setVerificationRecord(null)} 
        />
      )}
      {showCamera && (
        <CameraCapture
          onCapture={handlePhotoCapture}
          onCancel={handleCameraCancel}
          isLoading={isMarkingAttendance}
          uploadProgress={uploadProgress}
          statusMessage={statusMessage}
        />
      )}

      <div className="space-y-6">
        {/* Actions Bar */}
        {/* <div className="flex justify-end">
          <Link to="/student/join-course">
             <Button variant="outline">
               + Join New Course
             </Button>
          </Link>
        </div> */}

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
                    {session.lecturerName && (
                      <p className="text-sm text-gray-700 font-medium mb-1 flex items-center">
                        <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        Lecturer: {session.lecturerName}
                      </p>
                    )}
                    <p className="text-sm text-blue-600 font-medium mb-1 flex items-center">
                      <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                      </svg>
                      WiFi: {session.wifiSSID}
                    </p>
                    <p className="text-sm text-gray-500 mb-1 flex items-center">
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
                        <td className="px-6 py-4 text-sm text-gray-900">
                          <div className="font-medium">{record.sessionTitle || record.session?.title || 'Session'}</div>
                          <div className="text-gray-500 text-xs">
                            {record.courseName || record.course?.name || ''} 
                            {(record.courseCode || record.course?.code) && ` (${record.courseCode || record.course?.code})`}
                          </div>
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
              {selectedSession.lecturerName && (
                <p className="text-sm text-gray-700 font-medium mt-1">
                  Lecturer: {selectedSession.lecturerName}
                </p>
              )}
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <p className="text-sm font-medium text-blue-900 mb-2">📶 Required WiFi Network:</p>
              <p className="text-lg font-semibold text-blue-700">{selectedSession.wifiSSID}</p>
              <p className="text-xs text-blue-600 mt-2">Connect to this WiFi network before marking attendance</p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
              <div className="flex flex-col">
                <div className="flex items-center mb-3">
                  <svg className="h-5 w-5 text-yellow-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="font-bold text-yellow-800">Security Verification Active</span>
                </div>
                
                <div className="bg-white/50 rounded p-3 space-y-3 text-sm text-yellow-900">
                  <div className="flex items-start">
                    <span className="mr-2 mt-0.5 text-lg">📡</span>
                    <div>
                      <p className="font-semibold">Network Subnet Verification</p>
                      <p className="text-xs text-yellow-700">
                        Verifies you are connected to the school router ({selectedSession.wifiSSID}).
                        <br/>
                        <span className="font-medium text-red-600">Mobile data, personal hotspots, and VPNs are blocked.</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <span className="mr-2 mt-0.5 text-lg">📱</span>
                    <div>
                      <p className="font-semibold">Device Identity Binding</p>
                      <p className="text-xs text-yellow-700">
                        Current Device: <strong>{getDeviceName()}</strong><br/>
                        This device will be bound to your account for this session.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <span className="mr-2 mt-0.5 text-lg">📍</span>
                    <div>
                      <p className="font-semibold">GPS Location Check</p>
                      <p className="text-xs text-yellow-700">
                        Verifying physical presence within classroom range.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <span className="mr-2 mt-0.5 text-lg">📷</span>
                    <div>
                      <p className="font-semibold">Facial Verification</p>
                      <p className="text-xs text-yellow-700">
                        Live selfie check against your profile picture.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-3 text-xs text-yellow-600 italic border-t border-yellow-200 pt-2">
                  System automatically detects and flags suspicious attendance attempts.
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
                onClick={() => initiateAttendance(selectedSession)}
                isLoading={isMarkingAttendance}
                className="flex-1"
              >
                Proceed to Face Verification
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
