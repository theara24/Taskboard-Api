import { Router } from 'express';
import { IssueController } from '../controllers/issue.controller';
import { CommentController } from '../controllers/comment.controller';
import { LabelController } from '../controllers/label.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { getIssueSchema, updateIssueSchema } from '../validators/issue.validator';
import { createCommentSchema } from '../validators/comment.validator';
import { attachLabelSchema, detachLabelSchema } from '../validators/label.validator';

const router = Router();

router.use(authenticate);

// Issue operations
router.get('/:id', validate(getIssueSchema), IssueController.getById);
router.patch('/:id', validate(updateIssueSchema), IssueController.update);
router.delete('/:id', validate(getIssueSchema), IssueController.delete);
router.get('/:id/activities', validate(getIssueSchema), IssueController.getActivities);

// Issue Comments
router.post('/:issueId/comments', validate(createCommentSchema), CommentController.add);
router.get('/:issueId/comments', CommentController.list);

// Issue Labels
router.post('/:issueId/labels', validate(attachLabelSchema), LabelController.attach);
router.delete('/:issueId/labels/:labelId', validate(detachLabelSchema), LabelController.detach);
router.get('/:issueId/labels', LabelController.listByIssue);

export default router;
