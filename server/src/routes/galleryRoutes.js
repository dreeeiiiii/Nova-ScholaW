import { Router } from 'express';
import authenticate from '../middleware/authenticate.js';
import requireRole from '../middleware/requireRole.js';
import {
  uploadMediaHandler,
  listPendingMedia,
  approveMedia,
  rejectMedia,
  myUploads,
  browseGallery,
  getGalleryItem,
  searchGallery,
} from '../controllers/galleryController.js';

const router = Router();
const adminOnly = [authenticate, requireRole('admin')];
const authenticated = [authenticate];

router.post('/upload', authenticated, uploadMediaHandler);
router.get('/pending', adminOnly, listPendingMedia);
router.patch('/:id/approve', adminOnly, approveMedia);
router.patch('/:id/reject', adminOnly, rejectMedia);
router.get('/mine', authenticated, myUploads);
router.get('/search', searchGallery);
router.get('/', browseGallery);
router.get('/:id', getGalleryItem);

export default router;
