import { Router } from 'express';
import authenticate from '../../shared/middleware/authenticate.js';
import requireRole from '../../shared/middleware/requireRole.js';
import {
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
  deleteGalleryMedia,
} from './galleryController.js';

const router = Router();
const adminOnly = [authenticate, requireRole('admin')];
const authenticated = [authenticate];

router.post('/upload', authenticated, uploadMediaHandler);
router.get('/pending', adminOnly, listPendingMedia);
router.patch('/:id/approve', adminOnly, approveMedia);
router.patch('/:id/reject', adminOnly, rejectMedia);
router.patch('/:id/feature', adminOnly, featureMedia);
router.patch('/:id/category', adminOnly, reassignCategory);
router.get('/mine', authenticated, myUploads);
router.get('/search', searchGallery);
router.get('/', browseGallery);
router.delete('/:id', authenticated, deleteGalleryMedia);
router.get('/:id', getGalleryItem);

export default router;
