import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validate } from '../middleware/validate.middleware';
import { registerSchema, loginSchema, updateProfileSchema, changePasswordSchema } from '../validators/auth.validator';
import { authenticate } from '../middleware/auth.middleware';
import { authRateLimiter } from '../middleware/rate-limiter.middleware';

const router = Router();

router.post('/register', authRateLimiter, validate(registerSchema), AuthController.register);
router.post('/login', authRateLimiter, validate(loginSchema), AuthController.login);
router.get('/me', authenticate, AuthController.me);
router.patch('/profile', authenticate, validate(updateProfileSchema), AuthController.updateProfile);
router.post('/change-password', authenticate, validate(changePasswordSchema), AuthController.changePassword);

// Google OAuth endpoints
router.get('/google', AuthController.googleAuth);
router.get('/google/callback', AuthController.googleCallback);
router.post('/google/demo', AuthController.googleDemo);

export default router;
