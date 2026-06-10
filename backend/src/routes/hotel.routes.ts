import { Router } from 'express';
import { hotelController } from '../controllers/hotel.controller';
import { protect, restrictTo } from '../middlewares/auth.middleware';
import { uploadHotelImages } from '../middlewares/upload.middleware';

const router = Router();

// Public routes
router.get('/', hotelController.getAllHotels);
router.get('/:id', hotelController.getHotelById);

// Protected routes (Admin only)
router.post(
  '/',
  protect,
  restrictTo('Admin'),
  uploadHotelImages,
  hotelController.createHotel
);

router.put(
  '/:id',
  protect,
  restrictTo('Admin'),
  uploadHotelImages,
  hotelController.updateHotel
);

router.delete(
  '/:id',
  protect,
  restrictTo('Admin'),
  hotelController.deleteHotel
);

export default router;