import { execFile } from 'node:child_process';
import fs from 'node:fs';
import config from '../config/env.js';
import { FILE_RULES } from '../config/constants.js';

export function validateMediaFile(file, mediaType) {
  return new Promise((resolve, reject) => {
    if (!file) {
      return reject(new Error('No file provided.'));
    }

    const rules = FILE_RULES[mediaType];
    if (!rules) {
      return reject(new Error(`Unknown media type: ${mediaType}`));
    }

    if (!rules.allowedMimeTypes.includes(file.mimetype)) {
      if (file.path) fs.unlink(file.path, () => {});
      return reject(new Error(`Invalid file type. Expected ${rules.allowedMimeTypes.join(', ')}.`));
    }

    const maxBytes = rules.maxSizeMb * 1024 * 1024;
    if (file.size > maxBytes) {
      if (file.path) fs.unlink(file.path, () => {});
      return reject(new Error(`File too large. Maximum size is ${rules.maxSizeMb} MB.`));
    }

    resolve();
  });
}

export function validateVideoDuration(filePath) {
  return new Promise((resolve, reject) => {
    execFile('ffprobe', [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      filePath,
    ], (err, stdout) => {
      if (err) {
        fs.unlink(filePath, () => {});
        return reject(new Error('Could not validate video.'));
      }

      try {
        const info = JSON.parse(stdout);
        const duration = parseFloat(info.format?.duration);
        if (isNaN(duration)) {
          fs.unlink(filePath, () => {});
          return reject(new Error('Could not determine video duration.'));
        }
        if (duration > config.maxVideoDurationSeconds) {
          fs.unlink(filePath, () => {});
          return reject(new Error(`Video exceeds maximum duration of ${config.maxVideoDurationSeconds} seconds.`));
        }
        resolve({ duration_seconds: duration, ok: true });
      } catch (parseErr) {
        fs.unlink(filePath, () => {});
        reject(new Error('Could not validate video format.'));
      }
    });
  });
}

export async function validateUploadedFile(file, mediaType) {
  await validateMediaFile(file, mediaType);
  if (mediaType === 'video') {
    if (file.path) {
      await validateVideoDuration(file.path);
    } else if (file.buffer) {
      // For memory storage, write buffer to temp file for ffprobe
      const os = await import('node:os');
      const path = await import('node:path');
      const tmpPath = path.join(os.tmpdir(), `upload-${Date.now()}-${Math.round(Math.random() * 1e9)}.mp4`);
      await fs.promises.writeFile(tmpPath, file.buffer);
      try {
        await validateVideoDuration(tmpPath);
      } finally {
        fs.unlink(tmpPath, () => {});
      }
    }
  }
}

export default { validateMediaFile, validateVideoDuration, validateUploadedFile };