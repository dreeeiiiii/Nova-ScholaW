import { Router } from 'express';
import authenticate from '../../shared/middleware/authenticate.js';
import requireRole from '../../shared/middleware/requireRole.js';
import { createGeneralAnnouncement,createDepartmentAnnouncement,createClassAnnouncement,listAnnouncements,getAnnouncement,
  updateAnnouncement,deleteAnnouncement,tvAnnouncements,uploadAnnouncementImage } from './announcementController.js';
import { uploadImage,handleUploadError } from './upload.js';
const router=Router();
router.post('/announcements/general',authenticate,requireRole('admin'),createGeneralAnnouncement);
router.post('/announcements/department',authenticate,requireRole('admin'),createDepartmentAnnouncement);
router.post('/announcements/class',authenticate,requireRole('teacher'),createClassAnnouncement);
router.get('/announcements',authenticate,listAnnouncements);
router.get('/announcements/public',tvAnnouncements);
router.get('/announcements/tv',tvAnnouncements);
router.post('/announcements/upload-image',authenticate,requireRole('admin','teacher'),uploadImage,handleUploadError,uploadAnnouncementImage);
router.get('/announcements/:id',authenticate,getAnnouncement);
router.put('/announcements/:id',authenticate,updateAnnouncement);
router.delete('/announcements/:id',authenticate,deleteAnnouncement);
export default router;
