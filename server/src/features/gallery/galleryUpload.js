import multer from 'multer';
import multerErrorHandler from '../../shared/middleware/multerErrorHandler.js';

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedImageMimes = ['image/jpeg', 'image/png', 'image/webp'];
  const allowedVideoMimes = ['video/mp4'];
  if ([...allowedImageMimes, ...allowedVideoMimes].includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WebP images and MP4 videos are allowed.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 },
});

export const uploadMedia = upload.single('file');

export const handleGalleryUploadError = multerErrorHandler;

export default { uploadMedia, handleGalleryUploadError };