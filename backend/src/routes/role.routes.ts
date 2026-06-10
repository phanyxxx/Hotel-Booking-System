import { Router } from 'express';
import { roleController } from '../controllers/role.controller';
import { protect, restrictTo } from '../middlewares/auth.middleware';

const router = Router();

// Public routes (for setup only - should be protected in production)
router.get('/', roleController.getAllRoles);
router.post('/defaults', roleController.createDefaultRoles);

// Admin only
router.post('/', protect, restrictTo('Admin'), roleController.createRole);

export default router;