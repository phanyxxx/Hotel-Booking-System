import { Router } from 'express';
import { bookingController } from '../controllers/booking.controller';
import { protect, restrictTo } from '../middlewares/auth.middleware';

const router = Router();

// Customer routes
router.post('/', protect, bookingController.createBooking);
router.get('/my-bookings', protect, bookingController.getMyBookings);
router.put('/:id/cancel', protect, bookingController.cancelBooking);

// Admin & Staff routes
router.get('/', protect, restrictTo('Admin', 'Staff'), bookingController.getAllBookings);
router.get('/:id', protect, bookingController.getBookingById);
router.put('/:id/status', protect, restrictTo('Admin', 'Staff'), bookingController.updateBookingStatus);
router.post('/:id/checkin', protect, restrictTo('Admin', 'Staff'), bookingController.checkIn);
router.post('/:id/checkout', protect, restrictTo('Admin', 'Staff'), bookingController.checkOut);

export default router;