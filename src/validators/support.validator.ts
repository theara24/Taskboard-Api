import { z } from 'zod';
import { SupportCategory, SupportPriority, SupportStatus } from '@prisma/client';

export const createSupportTicketSchema = z.object({
  body: z.object({
    subject: z.string().min(3, 'Subject must be at least 3 characters long').max(200),
    description: z.string().min(5, 'Description must be at least 5 characters long').max(5000),
    category: z.nativeEnum(SupportCategory).optional(),
    priority: z.nativeEnum(SupportPriority).optional(),
  }),
});

export const addSupportMessageSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Ticket ID is required'),
  }),
  body: z.object({
    message: z.string().min(1, 'Message cannot be empty').max(5000),
  }),
});

export const updateSupportStatusSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Ticket ID is required'),
  }),
  body: z.object({
    status: z.nativeEnum(SupportStatus),
  }),
});

export const updateSupportPrioritySchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Ticket ID is required'),
  }),
  body: z.object({
    priority: z.nativeEnum(SupportPriority),
  }),
});
