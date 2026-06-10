import { Router } from 'express';
import { serviceController } from '../controllers/service.controller';
import { protect, restrictTo } from '../middlewares/auth.middleware';

const router = Router();

// ==================== Public Routes ====================
router.get('/', serviceController.getAllServices);
router.get('/popular', serviceController.getPopularServices);
router.get('/:id', serviceController.getServiceById);

// ==================== Customer Routes ====================
router.post('/booking', protect, serviceController.addServiceToBooking);
router.get('/booking/:bookingId', protect, serviceController.getBookingServices);
router.delete('/booking/:bookingServiceId', protect, serviceController.removeServiceFromBooking);

// ==================== Admin Routes ====================
router.post('/', protect, restrictTo('Admin'), serviceController.createService);
router.put('/:id', protect, restrictTo('Admin'), serviceController.updateService);
router.delete('/:id', protect, restrictTo('Admin'), serviceController.deleteService);

export default router;