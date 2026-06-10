import { Router } from 'express';
import { paymentController } from '../controllers/payment.controller';
import { protect, restrictTo } from '../middlewares/auth.middleware';

const router = Router();

// Customer routes
router.post('/', protect, paymentController.createPayment);
router.get('/my-history', protect, paymentController.getMyPaymentHistory);
router.get('/booking/:bookingId', protect, paymentController.getPaymentsByBooking);

// Admin only
router.get('/', protect, restrictTo('Admin'), paymentController.getAllPayments);

export default router;