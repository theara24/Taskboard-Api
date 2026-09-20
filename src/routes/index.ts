import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import projectRoutes from './project.routes';
import issueRoutes from './issue.routes';
import commentRoutes from './comment.routes';
import dashboardRoutes from './dashboard.routes';
import notificationRoutes from './notification.routes';
import invitationRoutes from './invitation.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/projects', projectRoutes);
router.use('/issues', issueRoutes);
router.use('/comments', commentRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/notifications', notificationRoutes);
router.use('/invitations', invitationRoutes);

export default router;
