import { Router } from 'express';
import { roomTypeController } from '../controllers/roomType.controller';
import { protect, restrictTo } from '../middlewares/auth.middleware';

const router = Router();

// Public routes
router.get('/', roomTypeController.getAllRoomTypes);
router.get('/:id', roomTypeController.getRoomTypeById);

// Admin only
router.post('/', protect, restrictTo('Admin'), roomTypeController.createRoomType);
router.put('/:id', protect, restrictTo('Admin'), roomTypeController.updateRoomType);
router.delete('/:id', protect, restrictTo('Admin'), roomTypeController.deleteRoomType);

export default router;