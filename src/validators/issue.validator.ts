import { z } from 'zod';
import { IssuePriority, IssueStatus, IssueType } from '@prisma/client';

const sanitizeQueryValue = (val: unknown) =>
  val === 'ALL' || val === '' || val === 'null' || val === 'undefined' ? undefined : val;

const optionalDueDate = z
  .preprocess((val) => {
    if (!val || val === '' || val === 'null' || val === 'undefined') return null;
    if (typeof val === 'string') {
      const d = new Date(val);
      if (!isNaN(d.getTime())) {
        return d.toISOString();
      }
    }
    return val;
  }, z.string().datetime().nullable())
  .optional();

const optionalAssigneeId = z
  .preprocess(sanitizeQueryValue, z.string().uuid('Invalid assignee ID format').nullable())
  .optional();

export const createIssueSchema = z.object({
  params: z.object({
    projectId: z.string().uuid('Invalid project ID format'),
  }),
  body: z.object({
    title: z.string().min(2, 'Title must be at least 2 characters long').max(200),
    description: z.string().max(5000).optional(),
    type: z.nativeEnum(IssueType).optional().default(IssueType.TASK),
    status: z.nativeEnum(IssueStatus).optional().default(IssueStatus.BACKLOG),
    priority: z.nativeEnum(IssuePriority).optional().default(IssuePriority.MEDIUM),
    assigneeId: optionalAssigneeId,
    dueDate: optionalDueDate,
    labelIds: z.array(z.string().uuid('Invalid label ID format')).optional(),
  }),
});

export const updateIssueSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid issue ID format'),
  }),
  body: z.object({
    title: z.string().min(2, 'Title must be at least 2 characters long').max(200).optional(),
    description: z.string().max(5000).nullable().optional(),
    type: z.nativeEnum(IssueType).optional(),
    status: z.nativeEnum(IssueStatus).optional(),
    priority: z.nativeEnum(IssuePriority).optional(),
    assigneeId: optionalAssigneeId,
    dueDate: optionalDueDate,
    labelIds: z.array(z.string().uuid('Invalid label ID format')).optional(),
  }),
});

export const getIssueSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Issue ID or Key is required'),
  }),
});

const pageLimitSchema = z.preprocess(
  (val) => (val !== undefined && val !== null ? String(val) : undefined),
  z.string().regex(/^\d+$/).optional(),
);

export const listProjectIssuesSchema = z.object({
  params: z.object({
    projectId: z.string().uuid('Invalid project ID format'),
  }),
  query: z.object({
    page: pageLimitSchema,
    limit: pageLimitSchema,
    status: z.preprocess(sanitizeQueryValue, z.nativeEnum(IssueStatus).optional()),
    priority: z.preprocess(sanitizeQueryValue, z.nativeEnum(IssuePriority).optional()),
    type: z.preprocess(sanitizeQueryValue, z.nativeEnum(IssueType).optional()),
    assigneeId: z.preprocess(sanitizeQueryValue, z.string().uuid().optional()),
    reporterId: z.preprocess(sanitizeQueryValue, z.string().uuid().optional()),
    q: z.preprocess(sanitizeQueryValue, z.string().optional()),
    search: z.preprocess(sanitizeQueryValue, z.string().optional()),
    sortBy: z.preprocess(
      sanitizeQueryValue,
      z.enum(['createdAt', 'updatedAt', 'priority', 'dueDate', 'title']).optional(),
    ),
    sortOrder: z.preprocess(sanitizeQueryValue, z.enum(['asc', 'desc']).optional()),
  }),
});

export const listAllIssuesSchema = z.object({
  query: z.object({
    projectId: z.preprocess(sanitizeQueryValue, z.string().uuid('Invalid project ID format').optional()),
    page: pageLimitSchema,
    limit: pageLimitSchema,
    status: z.preprocess(sanitizeQueryValue, z.nativeEnum(IssueStatus).optional()),
    priority: z.preprocess(sanitizeQueryValue, z.nativeEnum(IssuePriority).optional()),
    type: z.preprocess(sanitizeQueryValue, z.nativeEnum(IssueType).optional()),
    assigneeId: z.preprocess(sanitizeQueryValue, z.string().uuid().optional()),
    reporterId: z.preprocess(sanitizeQueryValue, z.string().uuid().optional()),
    q: z.preprocess(sanitizeQueryValue, z.string().optional()),
    search: z.preprocess(sanitizeQueryValue, z.string().optional()),
    sortBy: z.preprocess(
      sanitizeQueryValue,
      z.enum(['createdAt', 'updatedAt', 'priority', 'dueDate', 'title']).optional(),
    ),
    sortOrder: z.preprocess(sanitizeQueryValue, z.enum(['asc', 'desc']).optional()),
  }),
});

export type CreateIssueInput = z.infer<typeof createIssueSchema>['body'];
export type UpdateIssueInput = z.infer<typeof updateIssueSchema>['body'];
export type ListIssuesQuery = z.infer<typeof listProjectIssuesSchema>['query'];
export type ListAllIssuesQuery = z.infer<typeof listAllIssuesSchema>['query'];

