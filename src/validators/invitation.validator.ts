import { z } from 'zod';
import { ProjectMemberRole } from '@prisma/client';

export const inviteMemberSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid project ID format'),
  }),
  body: z.object({
    identifier: z.string().min(1, 'Google email or username is required').max(100),
    role: z.nativeEnum(ProjectMemberRole).optional().default(ProjectMemberRole.MEMBER),
  }),
});

export const respondInvitationSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid invitation ID format'),
  }),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>['body'];
