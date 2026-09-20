import { z } from 'zod';

export const createLabelSchema = z.object({
  params: z.object({
    projectId: z.string().uuid('Invalid project ID format'),
  }),
  body: z.object({
    name: z
      .string()
      .min(1, 'Label name cannot be empty')
      .max(50, 'Label name cannot exceed 50 characters')
      .trim(),
  }),
});

export const attachLabelSchema = z.object({
  params: z.object({
    issueId: z.string().uuid('Invalid issue ID format'),
  }),
  body: z.object({
    labelId: z.string().uuid('Invalid label ID format'),
  }),
});

export const detachLabelSchema = z.object({
  params: z.object({
    issueId: z.string().uuid('Invalid issue ID format'),
    labelId: z.string().uuid('Invalid label ID format'),
  }),
});

export type CreateLabelInput = z.infer<typeof createLabelSchema>['body'];
export type AttachLabelInput = z.infer<typeof attachLabelSchema>['body'];
