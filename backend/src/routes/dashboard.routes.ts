import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller';
import { protect, restrictTo } from '../middlewares/auth.middleware';

const router = Router();

// All dashboard routes require authentication and Admin role
router.use(protect);
router.use(restrictTo('Admin'));

router.get('/overview', dashboardController.getOverview);
router.get('/revenue', dashboardController.getRevenueReport);
router.get('/bookings', dashboardController.getBookingStatistics);
router.get('/top-hotels', dashboardController.getTopHotels);

export default router;