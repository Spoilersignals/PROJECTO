import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import apiService from '../../services/api';
import Button from '../common/Button';
import Input from '../common/Input';

const VerifyEmailForm: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email || '';

  const [verificationCode, setVerificationCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!verificationCode) {
      setError('Please enter the verification code');
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiService.verifyEmail(email, verificationCode);
      
      if (response.data?.accessToken) {
        localStorage.setItem('token', response.data.accessToken);
        localStorage.setItem('refreshToken', response.data.refreshToken);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }

      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResendLoading(true);
    setResendMessage('');
    setError('');

    try {
      await apiService.resendVerification(email);
      setResendMessage('Verification code resent! Check your email.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend code. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Verify Your Email
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            We sent a verification code to <span className="font-medium">{email}</span>
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <Input
            label="Verification Code"
            type="text"
            name="verificationCode"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
            placeholder="Enter 6-digit code"
            maxLength={6}
            required
          />

          {error && (
            <div className="text-red-600 text-sm text-center">
              {error}
            </div>
          )}

          {resendMessage && (
            <div className="text-green-600 text-sm text-center">
              {resendMessage}
            </div>
          )}

          <div className="space-y-3">
            <Button
              type="submit"
              className="w-full"
              isLoading={isLoading}
            >
              Verify Email
            </Button>

            <button
              type="button"
              onClick={handleResendCode}
              disabled={resendLoading}
              className="w-full text-sm text-primary-600 hover:text-primary-500 disabled:opacity-50"
            >
              {resendLoading ? 'Sending...' : 'Resend Code'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VerifyEmailForm;
