const path = require('path');
const fs = require('fs');
const canvas = require('canvas');
const faceapi = require('face-api.js');

// Patch the environment for Node.js
const { Canvas, Image, ImageData } = canvas;
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const WEIGHTS_PATH = path.join(__dirname, '../weights');
let modelsLoaded = false;

/**
 * Load models if they haven't been loaded yet
 */
const loadModels = async () => {
  if (modelsLoaded) return;

  try {
    console.log('Loading FaceAPI models...');
    // Load TinyFaceDetector for better performance on CPU
    await faceapi.nets.tinyFaceDetector.loadFromDisk(WEIGHTS_PATH);
    await faceapi.nets.faceLandmark68Net.loadFromDisk(WEIGHTS_PATH);
    await faceapi.nets.faceRecognitionNet.loadFromDisk(WEIGHTS_PATH);
    // Load SSD Mobilenet as fallback for better accuracy
    await faceapi.nets.ssdMobilenetv1.loadFromDisk(WEIGHTS_PATH); 
    modelsLoaded = true;
    console.log('FaceAPI models loaded successfully');
  } catch (error) {
    console.error('Error loading FaceAPI models:', error);
    throw error;
  }
};

/**
 * Resize image to reduce processing time (Crucial for CPU performance)
 * @param {Image} image - The loaded canvas image
 * @param {number} maxDim - Maximum width or height
 * @returns {Canvas} - Resized canvas
 */
const resizeImage = (image, maxDim = 800) => {
  const { width, height } = image;
  if (width <= maxDim && height <= maxDim) return image;
  
  const scale = Math.min(maxDim / width, maxDim / height);
  const newWidth = Math.round(width * scale);
  const newHeight = Math.round(height * scale);
  
  console.log(`[FaceAPI] Resizing image from ${width}x${height} to ${newWidth}x${newHeight}`);
  
  const resultCanvas = canvas.createCanvas(newWidth, newHeight);
  const ctx = resultCanvas.getContext('2d');
  ctx.drawImage(image, 0, 0, newWidth, newHeight);
  
  return resultCanvas;
};

/**
 * Compares two face images to determine if they match
 * @param {string} sourceImagePath - Path to the trusted profile picture
 * @param {string} targetImagePath - Path to the verification selfie
 * @returns {Promise<boolean>} - True if faces match
 */
const compareFaces = async (sourceImagePath, targetImagePath) => {
  try {
    await loadModels();

    // Resolve absolute paths
    const resolvePath = (imgStr) => {
      if (path.isAbsolute(imgStr) && fs.existsSync(imgStr)) return imgStr;
      const cleanPath = imgStr.startsWith('/') || imgStr.startsWith('\\') ? imgStr.substring(1) : imgStr;
      return path.join(__dirname, '../public', cleanPath);
    };

    const sourcePath = resolvePath(sourceImagePath);
    const targetPath = resolvePath(targetImagePath);

    if (!fs.existsSync(sourcePath)) {
      console.error(`Source image not found: ${sourcePath}`);
      return false;
    }
    if (!fs.existsSync(targetPath)) {
      console.error(`Target image not found: ${targetPath}`);
      return false;
    }

    console.log(`[FaceAPI] Comparing:\nSource: ${sourcePath}\nTarget: ${targetPath}`);

    // Load images
    console.log('[FaceAPI] Loading images into memory...');
    let sourceImage = await canvas.loadImage(sourcePath);
    let targetImage = await canvas.loadImage(targetPath);
    
    // Resize images to improve performance and prevent timeouts
    sourceImage = resizeImage(sourceImage);
    targetImage = resizeImage(targetImage);

    console.log('[FaceAPI] Images loaded and resized. Starting face detection...');

    // Helper to detect face with fallback
    const detectFace = async (image, name) => {
      // STRATEGY: Prioritize Accuracy over Speed (SSD Mobilenet first)
      
      console.log(`[FaceAPI] Detecting face in ${name} image using SSD Mobilenet (High Accuracy)...`);
      
      // SSD Mobilenet (accurate)
      // minConfidence 0.4 ensures we get a reasonably clear face
      const ssdOptions = new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4 });
      let detection = await faceapi
        .detectSingleFace(image, ssdOptions)
        .withFaceLandmarks()
        .withFaceDescriptor();
      
      if (detection) {
        console.log(`[FaceAPI] ${name} face found with SSD Mobilenet (Score: ${detection.detection.score.toFixed(3)})`);
        return detection;
      }

      console.log(`[FaceAPI] No face found in ${name} with SSD. Trying TinyFaceDetector (Fallback)...`);
      
      // Fallback: TinyFaceDetector (fast, but tweaked for better detection of small faces)
      // inputSize 512 (up from 416) improves small face detection
      const tinyOptions = new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.4, inputSize: 512 });
      
      detection = await faceapi
        .detectSingleFace(image, tinyOptions)
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        console.log(`[FaceAPI] ${name} face found with TinyFaceDetector (Score: ${detection.detection.score.toFixed(3)})`);
      } else {
        console.log(`[FaceAPI] No face found in ${name} with either detector.`);
      }
      
      return detection;
    };

    // Run detections in parallel to save time
    const [sourceDetection, targetDetection] = await Promise.all([
      detectFace(sourceImage, 'source'),
      detectFace(targetImage, 'target')
    ]);

    if (!sourceDetection) {
      console.log('[FaceAPI] No face detected in source (profile) image');
      return false;
    }

    if (!targetDetection) {
      console.log('[FaceAPI] No face detected in target (selfie) image');
      return false;
    }

    // Calculate Euclidean distance
    // Lower distance means more similar
    const distance = faceapi.euclideanDistance(
      sourceDetection.descriptor,
      targetDetection.descriptor
    );

    console.log(`[FaceAPI] Distance calculated: ${distance.toFixed(4)}`);

    // Threshold: 0.6 is standard. 0.5 is strict. 0.65 is lenient.
    // Increased from 0.6 to 0.65 to improve acceptance rate for legitimate users
    // while still maintaining reasonable security
    return distance < 0.65;

  } catch (error) {
    console.error('Face comparison error:', error);
    return false;
  }
};

module.exports = { compareFaces };
