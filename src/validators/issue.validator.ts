import { z } from 'zod';
import { IssuePriority, IssueStatus, IssueType } from '@prisma/client';

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
    assigneeId: z.string().uuid('Invalid assignee ID format').nullable().optional(),
    dueDate: z
      .string()
      .datetime({ message: 'dueDate must be a valid ISO-8601 datetime' })
      .nullable()
      .optional(),
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
    assigneeId: z.string().uuid('Invalid assignee ID format').nullable().optional(),
    dueDate: z.string().datetime().nullable().optional(),
  }),
});

export const getIssueSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Issue ID or Key is required'),
  }),
});

export const listProjectIssuesSchema = z.object({
  params: z.object({
    projectId: z.string().uuid('Invalid project ID format'),
  }),
  query: z.object({
    page: z.string().regex(/^\d+$/).optional(),
    limit: z.string().regex(/^\d+$/).optional(),
    status: z.nativeEnum(IssueStatus).optional(),
    priority: z.nativeEnum(IssuePriority).optional(),
    type: z.nativeEnum(IssueType).optional(),
    assigneeId: z.string().uuid().optional(),
    reporterId: z.string().uuid().optional(),
    q: z.string().optional(),
    search: z.string().optional(),
    sortBy: z.enum(['createdAt', 'updatedAt', 'priority', 'dueDate', 'title']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
  }),
});

export type CreateIssueInput = z.infer<typeof createIssueSchema>['body'];
export type UpdateIssueInput = z.infer<typeof updateIssueSchema>['body'];
export type ListIssuesQuery = z.infer<typeof listProjectIssuesSchema>['query'];
