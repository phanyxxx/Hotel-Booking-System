import { Router } from 'express';
import { roomController } from '../controllers/room.controller';
import { protect, restrictTo } from '../middlewares/auth.middleware';

const router = Router();

// Public routes
router.get('/', roomController.getAllRooms);
router.get('/available', roomController.getAvailableRooms);
router.get('/:id', roomController.getRoomById);

// Protected routes (Admin & Staff)
router.post('/', protect, restrictTo('Admin', 'Staff'), roomController.createRoom);
router.put('/:id', protect, restrictTo('Admin', 'Staff'), roomController.updateRoom);
router.patch('/:id/status', protect, restrictTo('Admin', 'Staff'), roomController.updateRoomStatus);
router.delete('/:id', protect, restrictTo('Admin'), roomController.deleteRoom);

export default router;