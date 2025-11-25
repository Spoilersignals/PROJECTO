const fs = require('fs');
const path = require('path');
const https = require('https');

const WEIGHTS_DIR = path.join(__dirname, '../weights');
const BASE_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';

const models = [
  'ssd_mobilenetv1_model-weights_manifest.json',
  'ssd_mobilenetv1_model-shard1',
  'ssd_mobilenetv1_model-shard2',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2'
];

if (!fs.existsSync(WEIGHTS_DIR)) {
  fs.mkdirSync(WEIGHTS_DIR, { recursive: true });
}

const downloadFile = (filename) => {
  return new Promise((resolve, reject) => {
    const fileUrl = `${BASE_URL}/${filename}`;
    const filePath = path.join(WEIGHTS_DIR, filename);
    const file = fs.createWriteStream(filePath);

    console.log(`Downloading ${filename}...`);

    https.get(fileUrl, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download ${filename}: ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`Saved ${filename}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filePath, () => {});
      reject(err);
    });
  });
};

const downloadAll = async () => {
  try {
    for (const model of models) {
      await downloadFile(model);
    }
    console.log('All models downloaded successfully!');
  } catch (error) {
    console.error('Error downloading models:', error);
  }
};

downloadAll();
