import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { protect } from '../middlewares/auth.middleware';
import { validateRegister, validateLogin } from '../validations/auth.validation';

const router = Router();

// Public routes
router.post('/register', validateRegister, authController.register);
router.post('/login', validateLogin, authController.login);

// Protected routes
router.post('/change-password', protect, authController.changePassword);
router.get('/me', protect, authController.getMe);

export default router;