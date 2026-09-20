import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { notificationIdSchema } from '../validators/notification.validator';

const router = Router();

router.use(authenticate);

router.get('/', NotificationController.list);
router.get('/unread-count', NotificationController.getUnreadCount);
router.patch('/:id/read', validate(notificationIdSchema), NotificationController.markRead);
router.post('/mark-all-read', NotificationController.markAllRead);

export default router;
