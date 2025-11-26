import React, { useRef, useState, useEffect } from 'react';
import Button from './Button';

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  onCancel: () => void;
  isLoading?: boolean;
  uploadProgress?: number;
  statusMessage?: string;
  errorMessage?: string;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ 
  onCapture, 
  onCancel, 
  isLoading = false,
  uploadProgress = 0,
  statusMessage = '',
  errorMessage = ''
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>('');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  const startCamera = async () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'user' } 
      });
      streamRef.current = mediaStream;
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setError('');
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError('Unable to access camera. Please allow camera permissions.');
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Re-attach stream when returning from preview (Retake)
  useEffect(() => {
    if (!capturedImage && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [capturedImage]);

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Set canvas dimensions to match video, but cap at 1024px for performance
      let width = video.videoWidth;
      let height = video.videoHeight;
      
      const MAX_SIZE = 1024;
      if (width > height) {
        if (width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        }
      } else {
        if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }
      }

      canvas.width = width;
      canvas.height = height;
      
      // Draw video frame to canvas
      const context = canvas.getContext('2d');
      if (context) {
        // Flip horizontally for mirror effect
        context.translate(width, 0);
        context.scale(-1, 1);
        context.drawImage(video, 0, 0, width, height);
        
        // Convert to data URL for preview (compress more for mobile networks)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
        setCapturedImage(dataUrl);
      }
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
  };

  const confirmPhoto = () => {
    if (capturedImage) {
      // Convert data URL to File object
      fetch(capturedImage)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });
          onCapture(file);
        });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-xl overflow-hidden shadow-2xl relative">
          <div className="p-4 bg-gray-100 border-b flex justify-between items-center sticky top-0 z-10">
            <h3 className="font-bold text-lg">Verify Identity</h3>
            <button onClick={onCancel} className="text-gray-500 hover:text-gray-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="relative bg-black aspect-[3/4] w-full flex items-center justify-center overflow-hidden">
            {error ? (
              <div className="text-white text-center p-6">
                <p className="text-red-400 mb-2">Camera Error</p>
                <p>{error}</p>
                <Button onClick={startCamera} className="mt-4" variant="outline">Retry</Button>
              </div>
            ) : (
              <>
                {!capturedImage ? (
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    className="w-full h-full object-cover transform -scale-x-100"
                  />
                ) : (
                  <img 
                    src={capturedImage} 
                    alt="Captured selfie" 
                    className="w-full h-full object-cover" 
                  />
                )}
                <canvas ref={canvasRef} className="hidden" />
              </>
            )}
          </div>

          <div className="p-6 flex flex-col space-y-3 bg-white">
            <p className="text-center text-sm text-gray-500 mb-2">
              Please take a clear selfie to verify your attendance.
            </p>
            
            {!capturedImage ? (
              <Button onClick={takePhoto} size="lg" className="w-full">
                Take Photo
              </Button>
            ) : (
              <div className="space-y-4">
                {errorMessage && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <svg className="h-5 w-5 text-red-400 mt-0.5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm text-red-700">{errorMessage}</p>
                    </div>
                  </div>
                )}
                {isLoading ? (
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-blue-800">
                        {statusMessage || 'Processing...'}
                      </span>
                      <span className="text-xs font-bold text-blue-600">{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2.5">
                      <div 
                        className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out" 
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-blue-500 mt-2 text-center">
                      Please wait, verifying your identity...
                    </p>
                  </div>
                ) : (
                  <div className="flex space-x-3">
                    <Button onClick={retakePhoto} variant="outline" className="flex-1" disabled={isLoading}>
                      Retake
                    </Button>
                    <Button onClick={confirmPhoto} className="flex-1" isLoading={isLoading} disabled={isLoading}>
                      Confirm & Submit
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CameraCapture;
