import { z } from 'zod';

export const createCommentSchema = z.object({
  params: z.object({
    issueId: z.string().uuid('Invalid issue ID format'),
  }),
  body: z.object({
    content: z.string().min(1, 'Comment content cannot be empty').max(2000),
  }),
});

export const updateCommentSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid comment ID format'),
  }),
  body: z.object({
    content: z.string().min(1, 'Comment content cannot be empty').max(2000),
  }),
});

export const deleteCommentSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid comment ID format'),
  }),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>['body'];
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>['body'];
