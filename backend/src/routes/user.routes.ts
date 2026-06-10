import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { protect, restrictTo } from '../middlewares/auth.middleware';

const router = Router();

// All user routes require authentication and Admin role
router.use(protect);
router.use(restrictTo('Admin'));

router.get('/', userController.getAllUsers);
router.get('/:id', userController.getUserById);
router.post('/', userController.createUser);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

export default router;