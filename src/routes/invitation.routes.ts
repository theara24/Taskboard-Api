import { Router } from 'express';
import { InvitationController } from '../controllers/invitation.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { respondInvitationSchema } from '../validators/invitation.validator';

const router = Router();

router.use(authenticate);

// In-notification response endpoints
router.post('/:id/accept', validate(respondInvitationSchema), InvitationController.accept);
router.post('/:id/decline', validate(respondInvitationSchema), InvitationController.decline);

export default router;
