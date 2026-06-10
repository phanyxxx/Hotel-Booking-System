import { Router } from 'express';
import { reviewController } from '../controllers/review.controller';
import { protect } from '../middlewares/auth.middleware';

const router = Router();

// Public routes
router.get('/hotel/:hotelId', reviewController.getHotelReviews);

// Protected routes
router.post('/', protect, reviewController.createReview);
router.put('/:id', protect, reviewController.updateReview);
router.delete('/:id', protect, reviewController.deleteReview);

export default router;