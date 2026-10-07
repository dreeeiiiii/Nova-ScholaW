import multer from 'multer';
import multerErrorHandler from '../../shared/middleware/multerErrorHandler.js';

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedImageMimes = ['image/jpeg', 'image/png', 'image/webp'];
  if (allowedImageMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WebP images are allowed.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

export const uploadMedia = upload.single('file');

export const handleGalleryUploadError = multerErrorHandler;

export default { uploadMedia, handleGalleryUploadError };