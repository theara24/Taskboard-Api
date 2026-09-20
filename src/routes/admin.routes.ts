import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { SupportController } from '../controllers/support.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireAdmin } from '../middleware/admin.middleware';
import { validate } from '../middleware/validate.middleware';
import { updateUserRoleSchema } from '../validators/admin.validator';
import {
  updateSupportStatusSchema,
  updateSupportPrioritySchema,
} from '../validators/support.validator';

const router = Router();

// Enforce both Authentication and Platform Admin Role
router.use(authenticate, requireAdmin);

// Admin Dashboard & Analytics
router.get('/dashboard', AdminController.getDashboardMetrics);

// Admin User Management
router.get('/users', AdminController.listUsers);
router.get('/users/:id', AdminController.getUserDetail);
router.patch('/users/:id/role', validate(updateUserRoleSchema), AdminController.updateUserRole);

// Admin Project Management
router.get('/projects', AdminController.listProjects);
router.get('/projects/:id', AdminController.getProjectDetail);
router.delete('/projects/:id', AdminController.deleteProject);

// Admin Support Ticket Management
router.get('/support/tickets', SupportController.listAdminTickets);
router.patch('/support/tickets/:id/status', validate(updateSupportStatusSchema), SupportController.updateStatus);
router.patch('/support/tickets/:id/priority', validate(updateSupportPrioritySchema), SupportController.updatePriority);

export default router;
