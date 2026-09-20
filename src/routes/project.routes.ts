import { Router } from 'express';
import { ProjectController } from '../controllers/project.controller';
import { IssueController } from '../controllers/issue.controller';
import { LabelController } from '../controllers/label.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireProjectMember, requireProjectOwner } from '../middleware/project.middleware';
import { validate } from '../middleware/validate.middleware';
import {
  createProjectSchema,
  updateProjectSchema,
  getProjectSchema,
  addProjectMemberSchema,
  removeProjectMemberSchema,
} from '../validators/project.validator';
import { createIssueSchema, listProjectIssuesSchema } from '../validators/issue.validator';
import { createLabelSchema } from '../validators/label.validator';

const router = Router();

router.use(authenticate);

// Projects
router.post('/', validate(createProjectSchema), ProjectController.create);
router.get('/', ProjectController.list);
router.get('/:id', validate(getProjectSchema), requireProjectMember, ProjectController.getById);
router.patch('/:id', validate(updateProjectSchema), requireProjectOwner, ProjectController.update);
router.delete('/:id', validate(getProjectSchema), requireProjectOwner, ProjectController.delete);

// Project Members
router.get(
  '/:id/members',
  validate(getProjectSchema),
  requireProjectMember,
  ProjectController.listMembers,
);
router.post(
  '/:id/members',
  validate(addProjectMemberSchema),
  requireProjectOwner,
  ProjectController.addMember,
);
router.delete(
  '/:id/members/:userId',
  validate(removeProjectMemberSchema),
  requireProjectOwner,
  ProjectController.removeMember,
);

// Project Issues
router.post(
  '/:projectId/issues',
  validate(createIssueSchema),
  requireProjectMember,
  IssueController.create,
);
router.get(
  '/:projectId/issues',
  validate(listProjectIssuesSchema),
  requireProjectMember,
  IssueController.listByProject,
);

// Project Labels
router.post(
  '/:projectId/labels',
  validate(createLabelSchema),
  requireProjectMember,
  LabelController.create,
);
router.get('/:projectId/labels', requireProjectMember, LabelController.listByProject);

export default router;
