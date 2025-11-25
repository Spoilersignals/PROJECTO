const fs = require('fs');
const path = require('path');
const https = require('https');

const WEIGHTS_DIR = path.join(__dirname, '../weights');
const BASE_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights';

const models = [
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model-shard1',
];

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
    console.log('Tiny Face Detector models downloaded successfully!');
  } catch (error) {
    console.error('Error downloading models:', error);
  }
};

downloadAll();
