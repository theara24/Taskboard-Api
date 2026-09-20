import { z } from 'zod';
import { ProjectMemberRole } from '@prisma/client';

export const createProjectSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Project name must be at least 2 characters long').max(100),
    key: z
      .string()
      .min(2, 'Project key must be at least 2 characters')
      .max(10, 'Project key cannot exceed 10 characters')
      .regex(/^[A-Z0-9]+$/, 'Project key must be uppercase alphanumeric (e.g., TASK, WEB)'),
    description: z.string().max(1000).optional(),
  }),
});

export const updateProjectSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid project ID format'),
  }),
  body: z.object({
    name: z.string().min(2, 'Project name must be at least 2 characters long').max(100).optional(),
    description: z.string().max(1000).nullable().optional(),
  }),
});

export const getProjectSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid project ID format'),
  }),
});

export const addProjectMemberSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid project ID format'),
  }),
  body: z
    .object({
      userId: z.string().uuid('Invalid user ID format').optional(),
      email: z.string().email('Invalid email address format').optional(),
      role: z.nativeEnum(ProjectMemberRole).optional().default(ProjectMemberRole.MEMBER),
    })
    .refine((data) => data.userId || data.email, {
      message: 'Either userId or email must be provided to add a member',
    }),
});

export const removeProjectMemberSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid project ID format'),
    userId: z.string().uuid('Invalid user ID format'),
  }),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>['body'];
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>['body'];
export type AddProjectMemberInput = z.infer<typeof addProjectMemberSchema>['body'];
