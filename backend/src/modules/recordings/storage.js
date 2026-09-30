// const fs = require('fs');
// const path = require('path');
// const multer = require('multer');

// const env = require('../../config/env');

// const buildFolder = () => {
//   const now = new Date();
//   const year = String(now.getFullYear());
//   const month = String(now.getMonth() + 1).padStart(2, '0');
//   return path.join(process.cwd(), env.uploadDir, 'recordings', year, month);
// };

// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     const dir = buildFolder();
//     fs.mkdirSync(dir, { recursive: true });
//     cb(null, dir);
//   },
//   filename: (req, file, cb) => {
//     const ext = path.extname(file.originalname || '') || '.dat';
//     const safeName = `call_${req.params.id}_${Date.now()}${ext}`;
//     cb(null, safeName);
//   },
// });

// const uploadRecording = multer({
//   storage,
//   limits: {
//     fileSize: 50 * 1024 * 1024,
//   },
// });

// module.exports = {
//   uploadRecording,
// };



const fs = require('fs');
const path = require('path');
const multer = require('multer');

const env = require('../../config/env');

const buildFolder = () => {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return path.join(process.cwd(), env.uploadDir, 'recordings', year, month);
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = buildFolder();
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '') || '.dat';
    const safeName = `call_${req.params.id}_${Date.now()}${ext}`;
    cb(null, safeName);
  },
});

const uploadRecording = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});

module.exports = {
  uploadRecording,
};

