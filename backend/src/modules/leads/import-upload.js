const multer = require('multer');
const AppError = require('../../core/errors/app-error');

const storage = multer.memoryStorage();

const allowedMimeTypes = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'application/csv',
]);

const uploadLeadImportFile = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = (file.originalname || '').toLowerCase();
    const isAllowedExt = ext.endsWith('.xlsx') || ext.endsWith('.xls') || ext.endsWith('.csv');
    const isAllowedMime = allowedMimeTypes.has(file.mimetype);

    if (!isAllowedExt && !isAllowedMime) {
      return cb(new AppError('Only .xlsx, .xls, or .csv files are supported', 400));
    }

    return cb(null, true);
  },
});

module.exports = {
  uploadLeadImportFile,
};

