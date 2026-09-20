import { Router } from 'express';
import { SupportController } from '../controllers/support.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  createSupportTicketSchema,
  addSupportMessageSchema,
} from '../validators/support.validator';

const router = Router();

router.use(authenticate);

router.post('/tickets', validate(createSupportTicketSchema), SupportController.createTicket);
router.get('/tickets', SupportController.listUserTickets);
router.get('/tickets/:id', SupportController.getTicketById);
router.post('/tickets/:id/messages', validate(addSupportMessageSchema), SupportController.addMessage);

export default router;
