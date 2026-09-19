import fs from 'node:fs';
import { uploadMedia, handleGalleryUploadError } from './galleryUpload.js';
import { validateUploadedFile } from '../../shared/utils/validateMedia.js';
import { audit } from '../audit/auditService.js';
import { parseId } from '../../shared/utils/parseId.js';
import * as galleryModel from './galleryModel.js';
import { findCategoryById } from '../categories/categoryModel.js';

const getFileUrl = (file) => {
  const isVideo = file.mimetype === 'video/mp4';
  const subfolder = isVideo ? 'videos' : 'images';
  return `/uploads/gallery/${subfolder}/${file.filename}`;
};

const determineMediaType = (file) => {
  if (file.mimetype === 'video/mp4') return 'video';
  return 'image';
};

export const uploadMediaHandler = [uploadMedia, handleGalleryUploadError, async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ status: 400, message: 'No file provided.' });
    }

    const categoryId = req.body.category_id;
    const title = req.body.title;
    const description = req.body.description || '';

    if (!categoryId) {
      fs.unlink(file.path, () => {});
      return res.status(400).json({ status: 400, message: 'category_id is required.' });
    }
    if (!title || title.trim() === '') {
      fs.unlink(file.path, () => {});
      return res.status(400).json({ status: 400, message: 'title is required.' });
    }
    const caption = description.trim() !== '' ? description.trim() : title.trim();

    const mediaType = determineMediaType(file);
    await validateUploadedFile(file, mediaType);

    const fileUrl = getFileUrl(file);

    try {
      const media = await galleryModel.insertMedia({
        uploader_id: req.user.id,
        category_id: categoryId,
        media_type: mediaType,
        file_url: fileUrl,
        original_filename: file.originalname,
        caption,
      });

      await audit(req, 'gallery.upload', 'gallery_media', media.id, {
        media_type: mediaType,
        category_id: categoryId,
        original_filename: file.originalname,
      });

      return res.status(201).json({ media });
    } catch (dbErr) {
      if (dbErr.code === '23503') {
        fs.unlink(file.path, () => {});
        return res.status(400).json({ status: 400, message: 'category_id does not exist.' });
      }
      throw dbErr;
    }
  } catch (err) {
    if (err.message && (err.message.includes('Invalid file type') || err.message.includes('File too large') || err.message.includes('Could not validate') || err.message.includes('Could not determine') || err.message.includes('Unknown media type'))) {
      return res.status(400).json({ status: 400, message: err.message });
    }
    return next(err);
  }
}];

export const listPendingMedia = async (req, res, next) => {
  try {
    const media = await galleryModel.listPending();
    return res.json({ media });
  } catch (err) {
    return next(err);
  }
};

export const approveMedia = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ status: 400, message: 'Invalid media id.' });
    }

    const existing = await galleryModel.findById(id);
    if (!existing) {
      return res.status(404).json({ status: 404, message: 'Media not found.' });
    }

    if (existing.status !== 'pending') {
      return res.status(400).json({ status: 400, message: 'Media is not pending approval.' });
    }

    const media = await galleryModel.approve(id, req.user.id);

    await audit(req, 'gallery.approve', 'gallery_media', id, null);

    return res.json({ media });
  } catch (err) {
    return next(err);
  }
};

export const rejectMedia = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ status: 400, message: 'Invalid media id.' });
    }

    const { rejection_reason } = req.body || {};
    if (!rejection_reason || rejection_reason.trim() === '') {
      return res.status(400).json({ status: 400, message: 'rejection_reason is required.' });
    }

    const existing = await galleryModel.findById(id);
    if (!existing) {
      return res.status(404).json({ status: 404, message: 'Media not found.' });
    }

    if (existing.status !== 'pending') {
      return res.status(400).json({ status: 400, message: 'Media is not pending approval.' });
    }

    const media = await galleryModel.reject(id, req.user.id, rejection_reason);

    await audit(req, 'gallery.reject', 'gallery_media', id, { rejection_reason });

    return res.json({ media });
  } catch (err) {
    return next(err);
  }
};

export const myUploads = async (req, res, next) => {
  try {
    const media = await galleryModel.listByUploader(req.user.id);
    return res.json({ media });
  } catch (err) {
    return next(err);
  }
};

export const browseGallery = async (req, res, next) => {
  try {
    const { category_id, year, month, media_type, limit = 20, offset = 0 } = req.query;
    const featured = req.query.featured === 'true' ? true : undefined;

    const { media, total } = await galleryModel.browse({ category_id, year, month, media_type, featured, limit, offset });

    return res.json({ media, total });
  } catch (err) {
    return next(err);
  }
};

export const featureMedia = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ status: 400, message: 'Invalid media id.' });
    }

    const { featured } = req.body ?? {};
    if (typeof featured !== 'boolean') {
      return res.status(400).json({ status: 400, message: 'featured must be a boolean.' });
    }

    const existing = await galleryModel.findById(id);
    if (!existing) {
      return res.status(404).json({ status: 404, message: 'Media not found.' });
    }

    const media = await galleryModel.setFeatured(id, featured);

    await audit(req, 'gallery.feature', 'gallery_media', id, { featured });

    return res.json({ media });
  } catch (err) {
    return next(err);
  }
};

export const reassignCategory = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ status: 400, message: 'Invalid media id.' });
    }

    if (!req.body || !Object.prototype.hasOwnProperty.call(req.body, 'category_id')) {
      return res.status(400).json({ status: 400, message: 'category_id is required.' });
    }

    const { category_id } = req.body;

    let newCategoryId;
    if (category_id === null) {
      newCategoryId = null;
    } else if (typeof category_id === 'number' && Number.isInteger(category_id) && category_id > 0) {
      const cat = await findCategoryById(category_id);
      if (!cat) {
        return res.status(400).json({ status: 400, message: 'Category does not exist.' });
      }
      newCategoryId = category_id;
    } else {
      return res.status(400).json({ status: 400, message: 'category_id must be an integer or null.' });
    }

    const existing = await galleryModel.findById(id);
    if (!existing) {
      return res.status(404).json({ status: 404, message: 'Media not found.' });
    }

    if (existing.status !== 'pending') {
      return res.status(400).json({ status: 400, message: 'Only pending media can have its category reassigned.' });
    }

    const media = await galleryModel.updateCategory(id, newCategoryId);

    await audit(req, 'gallery.category_update', 'gallery_media', id, { category_id: newCategoryId });

    return res.json({ media });
  } catch (err) {
    return next(err);
  }
};

export const getGalleryItem = async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    if (id === null) {
      return res.status(400).json({ status: 400, message: 'Invalid media id.' });
    }

    const media = await galleryModel.findApprovedById(id);

    if (!media) {
      return res.status(404).json({ status: 404, message: 'Media not found.' });
    }

    return res.json({ media });
  } catch (err) {
    return next(err);
  }
};

export const searchGallery = async (req, res, next) => {
  try {
    const { q, category_id: rawCategoryId, year: rawYear, media_type: rawMediaType, limit: rawLimit, offset: rawOffset } = req.query;
    if (!q || q.trim() === '') {
      return res.status(400).json({ status: 400, message: 'q query parameter is required.' });
    }

    let category_id;
    if (rawCategoryId !== undefined && rawCategoryId !== '') {
      category_id = parseId(rawCategoryId);
      if (category_id === null) {
        return res.status(400).json({ status: 400, message: 'Invalid category_id.' });
      }
    }

    let year;
    if (rawYear !== undefined && rawYear !== '') {
      const parsedYear = Number(rawYear);
      if (!Number.isInteger(parsedYear) || parsedYear < 1000 || parsedYear > 9999) {
        return res.status(400).json({ status: 400, message: 'Invalid year.' });
      }
      year = parsedYear;
    }

    let media_type;
    if (rawMediaType !== undefined && rawMediaType !== '') {
      if (rawMediaType !== 'image' && rawMediaType !== 'video') {
        return res.status(400).json({ status: 400, message: 'Invalid media_type. Must be image or video.' });
      }
      media_type = rawMediaType;
    }

    const limit = rawLimit !== undefined ? Math.min(Math.max(Number(rawLimit) || 20, 1), 100) : 20;
    // Validate limit numeric? Non-numeric falls to default via Number conversion above; keep behavior
    if (rawLimit !== undefined && Number.isNaN(Number(rawLimit))) {
      // still default; no 400 — matches browse behavior
    }
    const offset = Math.max(Number(rawOffset) || 0, 0);

    const { media, total } = await galleryModel.search({
      q: q.trim(),
      category_id,
      year,
      media_type,
      limit,
      offset,
    });

    return res.json({ media, total });
  } catch (err) {
    return next(err);
  }
};

export default {
  uploadMediaHandler,
  listPendingMedia,
  approveMedia,
  rejectMedia,
  myUploads,
  browseGallery,
  getGalleryItem,
  searchGallery,
  featureMedia,
  reassignCategory,
};
