import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../common/Layout';
import Button from '../common/Button';
import Input from '../common/Input';
import LoadingSpinner from '../common/LoadingSpinner';
import apiService from '../../services/api';
import { Course } from '../../types';

const JoinCourse: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const allCourses = await apiService.getCourses();
      setCourses(allCourses);
    } catch (err) {
      setError('Failed to load courses');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoin = async (courseId: string) => {
    setJoiningId(courseId);
    try {
      // Call the join endpoint directly (need to add to apiService first if not generic)
      // Using the generic axios instance from apiService
      await (apiService as any).api.post(`/courses/${courseId}/join`);
      
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to join course');
    } finally {
      setJoiningId(null);
    }
  };

  const filteredCourses = courses.filter(course => 
    course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    course.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Layout title="Join a Course">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Find Courses</h2>
          <div className="flex gap-4 mb-6">
            <Input
              name="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by course name or code..."
              className="flex-1"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-md mb-4">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredCourses.map(course => (
                <div key={course.id} className="border rounded-lg p-4 hover:border-blue-500 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-lg">{course.code}</h3>
                      <p className="font-medium text-gray-900">{course.name}</p>
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${course.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {course.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {course.description}
                  </p>
                  
                  <Button 
                    onClick={() => handleJoin(course.id)}
                    disabled={!course.isActive || !!joiningId}
                    isLoading={joiningId === course.id}
                    className="w-full"
                  >
                    Join Course
                  </Button>
                </div>
              ))}
              
              {filteredCourses.length === 0 && (
                <div className="col-span-2 text-center py-8 text-gray-500">
                  No courses found matching your search.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default JoinCourse;
