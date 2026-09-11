import multer from 'multer';

export const mediaErrorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ status: 400, message: 'File too large.' });
    }
    return res.status(400).json({ status: 400, message: err.message });
  }
  if (err.message && (err.message.includes('Invalid file type') || err.message.includes('Only'))) {
    return res.status(400).json({ status: 400, message: err.message });
  }
  if (err.message && err.message.includes('Could not validate video')) {
    return res.status(400).json({ status: 400, message: 'Could not validate video.' });
  }
  if (err.message && err.message.includes('ffprobe')) {
    return res.status(400).json({ status: 400, message: 'Could not validate video.' });
  }
  next(err);
};

export default mediaErrorHandler;