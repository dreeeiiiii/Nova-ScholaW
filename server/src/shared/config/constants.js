export const FILE_RULES = Object.freeze({
  image: {
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxSizeMb: 10,
  },
  video: {
    allowedExtensions: ['.mp4'],
    allowedMimeTypes: ['video/mp4'],
    maxSizeMb: 50,
    maxDurationSeconds: 120,
  },
});
