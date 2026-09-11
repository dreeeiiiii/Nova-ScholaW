import multer from 'multer';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const getStorage = () => {
  return multer.diskStorage({
    destination: (req, file, cb) => {
      const isVideo = file.mimetype === 'video/mp4';
      const subfolder = isVideo ? 'videos' : 'images';
      cb(null, path.join(__dirname, '../../uploads/gallery', subfolder));
    },
    filename: (req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = path.extname(file.originalname);
      cb(null, `${unique}${ext}`);
    },
  });
};

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
  storage: getStorage(),
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 },
});

export const uploadMedia = upload.single('file');

export const handleGalleryUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ status: 400, message: 'File too large.' });
    }
    return res.status(400).json({ status: 400, message: err.message });
  }
  if (err.message && (err.message.includes('Invalid file type') || err.message.includes('Only'))) {
    return res.status(400).json({ status: 400, message: err.message });
  }
  next(err);
};

export default { uploadMedia, handleGalleryUploadError };