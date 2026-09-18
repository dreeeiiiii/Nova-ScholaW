import multer from 'multer';

const multerErrorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ status: 400, message: 'File too large.' });
    }
    return res.status(400).json({ status: 400, message: err.message });
  }
  if (err.message && (
    err.message.includes('Invalid file type') ||
    err.message.includes('Only') ||
    err.message.includes('Could not validate') ||
    err.message.includes('Could not determine') ||
    err.message.includes('Unknown media type')
  )) {
    return res.status(400).json({ status: 400, message: err.message });
  }
  next(err);
};

export default multerErrorHandler;
