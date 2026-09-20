import { Router } from 'express';
import { CommentController } from '../controllers/comment.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { updateCommentSchema, deleteCommentSchema } from '../validators/comment.validator';

const router = Router();

router.use(authenticate);

router.patch('/:id', validate(updateCommentSchema), CommentController.update);
router.delete('/:id', validate(deleteCommentSchema), CommentController.delete);

export default router;
