import { Router } from 'express';

import authenticate from '../../shared/middleware/authenticate.js';
import requireRole from '../../shared/middleware/requireRole.js';
import {
  createGeneralAnnouncement,
  createClassAnnouncement,
  listAnnouncements,
  getAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  tvAnnouncements,
  uploadAnnouncementImage,
} from './announcementController.js';
import { uploadImage, handleUploadError } from './upload.js';

const router = Router();
const adminOrTeacher = [authenticate, requireRole('admin', 'teacher')];
const authenticated = [authenticate];

router.post('/announcements/general', adminOrTeacher, createGeneralAnnouncement);
router.post('/announcements/class', adminOrTeacher, createClassAnnouncement);
router.get('/announcements', authenticated, listAnnouncements);
router.get('/announcements/tv', tvAnnouncements);
router.post('/announcements/upload-image', adminOrTeacher, uploadImage, handleUploadError, uploadAnnouncementImage);
router.get('/announcements/:id', authenticated, getAnnouncement);
router.put('/announcements/:id', authenticated, updateAnnouncement);
router.delete('/announcements/:id', authenticated, deleteAnnouncement);

export default router;