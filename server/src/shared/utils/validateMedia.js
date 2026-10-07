import sharp from 'sharp';
import { FILE_RULES } from '../config/constants.js';
export async function validateMediaFile(file, mediaType = 'image') {
  if (!file) throw new Error('No file provided.');
  const rules = FILE_RULES[mediaType];
  if (!rules || !rules.allowedMimeTypes.includes(file.mimetype)) throw new Error('Invalid file type. Only JPEG, PNG, WebP images are allowed.');
  if (file.size > 10 * 1024 * 1024) throw new Error('File too large. Maximum size is 10 MB.');
}
export async function validateUploadedFile(file, mediaType = 'image') {
  await validateMediaFile(file, mediaType);
  try {
    const image = sharp(file.buffer || file.path, { limitInputPixels: 40000000 });
    const metadata = await image.metadata();
    const expected = { 'image/jpeg': 'jpeg', 'image/png': 'png', 'image/webp': 'webp' };
    if (metadata.format !== expected[file.mimetype] || (metadata.pages || 1) > 1) throw new Error();
    await image.stats();
  } catch { throw new Error('Could not validate image content. Upload a valid JPEG, PNG, or WebP image.'); }
}
export default { validateMediaFile, validateUploadedFile };
