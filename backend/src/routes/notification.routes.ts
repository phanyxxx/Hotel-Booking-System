import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller';
import { protect, restrictTo } from '../middlewares/auth.middleware';

const router = Router();

// ==================== Customer Routes ====================
router.get('/my', protect, notificationController.getMyNotifications);
router.get('/my/settings', protect, notificationController.getNotificationSettings);
router.put('/my/settings', protect, notificationController.updateNotificationSettings);
router.put('/:id/read', protect, notificationController.markAsRead);
router.put('/read/all', protect, notificationController.markAllAsRead);
router.delete('/:id', protect, notificationController.deleteNotification);

// ==================== Admin Routes ====================
router.get('/', protect, restrictTo('Admin'), notificationController.getAllNotifications);
router.post('/', protect, restrictTo('Admin'), notificationController.createNotification);
router.post('/bulk', protect, restrictTo('Admin'), notificationController.sendBulkNotification);

export default router;