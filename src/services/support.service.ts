import { SupportCategory, SupportPriority, SupportStatus, Role, NotificationType } from '@prisma/client';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/api-error';
import { ErrorCode } from '../constants/error-codes';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination';
import { PlatformActivityService } from './platform-activity.service';

export interface CreateSupportTicketInput {
  subject: string;
  description: string;
  category?: SupportCategory;
  priority?: SupportPriority;
}

export interface ListSupportTicketsQuery {
  page?: string;
  limit?: string;
  status?: SupportStatus;
  priority?: SupportPriority;
  category?: SupportCategory;
  q?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class SupportService {
  static async createTicket(userId: string, input: CreateSupportTicketInput) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw ApiError.notFound('User not found', ErrorCode.USER_NOT_FOUND);
    }

    // Atomic transaction for ticket numbering
    const ticket = await prisma.$transaction(async (tx) => {
      const maxTicket = await tx.supportTicket.findFirst({
        orderBy: { ticketNumber: 'desc' },
        select: { ticketNumber: true },
      });

      const nextNumber = (maxTicket?.ticketNumber || 0) + 1;
      const ticketKey = `SUP-${nextNumber}`;

      const newTicket = await tx.supportTicket.create({
        data: {
          ticketNumber: nextNumber,
          ticketKey,
          userId,
          subject: input.subject.trim(),
          description: input.description.trim(),
          category: input.category || SupportCategory.OTHER,
          priority: input.priority || SupportPriority.MEDIUM,
          status: SupportStatus.OPEN,
        },
        include: {
          user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        },
      });

      // Initial message
      await tx.supportTicketMessage.create({
        data: {
          ticketId: newTicket.id,
          userId,
          message: input.description.trim(),
        },
      });

      return newTicket;
    });

    // Log Platform Activity
    await PlatformActivityService.log(
      'SUPPORT_TICKET_CREATED',
      `${user.name} submitted support ticket ${ticket.ticketKey}: "${ticket.subject}"`,
      userId,
      { ticketId: ticket.id, ticketKey: ticket.ticketKey, priority: ticket.priority },
    );

    // Notify Platform Admins
    const admins = await prisma.user.findMany({
      where: { role: Role.ADMIN },
      select: { id: true },
    });

    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          type: NotificationType.SUPPORT_TICKET_CREATED,
          title: `New Support Ticket ${ticket.ticketKey}`,
          message: `${user.name} submitted ticket "${ticket.subject}" (${ticket.priority} priority)`,
          data: { ticketId: ticket.id, ticketKey: ticket.ticketKey },
        })),
      });
    }

    return ticket;
  }

  static async listTickets(filterUserId?: string, query: ListSupportTicketsQuery = {}) {
    const { page, limit, skip } = getPaginationParams(query.page, query.limit);

    const where: any = {};

    if (filterUserId) {
      where.userId = filterUserId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.priority) {
      where.priority = query.priority;
    }

    if (query.category) {
      where.category = query.category;
    }

    const search = query.q || query.search;
    if (search) {
      where.OR = [
        { subject: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { ticketKey: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const sortField = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    const orderBy: any = {};
    if (sortField === 'priority') {
      orderBy.priority = sortOrder;
    } else if (sortField === 'status') {
      orderBy.status = sortOrder;
    } else if (sortField === 'updatedAt') {
      orderBy.updatedAt = sortOrder;
    } else {
      orderBy.createdAt = sortOrder;
    }

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          _count: { select: { messages: true } },
        },
      }),
      prisma.supportTicket.count({ where }),
    ]);

    const pagination = buildPaginationMeta(total, page, limit);

    return { tickets, pagination };
  }

  static async getTicketByIdOrKey(identifier: string, requestingUser: { id: string; role: Role }) {
    const ticket = await prisma.supportTicket.findFirst({
      where: {
        OR: [{ id: identifier }, { ticketKey: identifier.toUpperCase() }],
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true, role: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true, role: true } },
          },
        },
      },
    });

    if (!ticket) {
      throw ApiError.notFound('Support ticket not found', ErrorCode.SUPPORT_TICKET_NOT_FOUND);
    }

    // Authorization check: Non-admin can only view their own ticket
    if (requestingUser.role !== Role.ADMIN && ticket.userId !== requestingUser.id) {
      throw ApiError.forbidden(
        'Access denied: You are not authorized to view this support ticket',
        ErrorCode.FORBIDDEN,
      );
    }

    return ticket;
  }

  static async addMessage(
    ticketId: string,
    sender: { id: string; role: Role; name: string },
    messageText: string,
  ) {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    if (!ticket) {
      throw ApiError.notFound('Support ticket not found', ErrorCode.SUPPORT_TICKET_NOT_FOUND);
    }

    // Authorization check
    if (sender.role !== Role.ADMIN && ticket.userId !== sender.id) {
      throw ApiError.forbidden(
        'Access denied: You are not authorized to reply to this support ticket',
        ErrorCode.FORBIDDEN,
      );
    }

    const newMessage = await prisma.supportTicketMessage.create({
      data: {
        ticketId: ticket.id,
        userId: sender.id,
        message: messageText.trim(),
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true, role: true } },
      },
    });

    // Update ticket status if resolved or closed, re-open to IN_PROGRESS if admin replies
    const updates: any = { updatedAt: new Date() };
    if (sender.role === Role.ADMIN && ticket.status === SupportStatus.OPEN) {
      updates.status = SupportStatus.IN_PROGRESS;
    }
    await prisma.supportTicket.update({
      where: { id: ticket.id },
      data: updates,
    });

    // Send notifications
    if (sender.role === Role.ADMIN) {
      // Notify Ticket Owner
      await prisma.notification.create({
        data: {
          userId: ticket.userId,
          type: NotificationType.SUPPORT_TICKET_REPLY,
          title: `Support Ticket Updated`,
          message: `Admin replied to ticket ${ticket.ticketKey}: "${ticket.subject}"`,
          data: { ticketId: ticket.id, ticketKey: ticket.ticketKey },
        },
      });
    } else {
      // Notify Admins
      const admins = await prisma.user.findMany({
        where: { role: Role.ADMIN },
        select: { id: true },
      });
      if (admins.length > 0) {
        await prisma.notification.createMany({
          data: admins.map((admin) => ({
            userId: admin.id,
            type: NotificationType.SUPPORT_TICKET_REPLY,
            title: `Reply on Support Ticket ${ticket.ticketKey}`,
            message: `${sender.name} replied on ticket "${ticket.subject}"`,
            data: { ticketId: ticket.id, ticketKey: ticket.ticketKey },
          })),
        });
      }
    }

    return newMessage;
  }

  static async updateStatus(ticketId: string, newStatus: SupportStatus) {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: { user: { select: { id: true, name: true } } },
    });

    if (!ticket) {
      throw ApiError.notFound('Support ticket not found', ErrorCode.SUPPORT_TICKET_NOT_FOUND);
    }

    const updates: any = {
      status: newStatus,
      updatedAt: new Date(),
    };

    if (newStatus === SupportStatus.RESOLVED && !ticket.resolvedAt) {
      updates.resolvedAt = new Date();
    }

    const updatedTicket = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: updates,
    });

    if (newStatus === SupportStatus.RESOLVED) {
      await PlatformActivityService.log(
        'SUPPORT_TICKET_RESOLVED',
        `Support ticket ${ticket.ticketKey} ("${ticket.subject}") marked as RESOLVED`,
        ticket.userId,
        { ticketId: ticket.id, ticketKey: ticket.ticketKey },
      );
    }

    // Notify user of status change
    await prisma.notification.create({
      data: {
        userId: ticket.userId,
        type: NotificationType.SUPPORT_TICKET_STATUS_CHANGED,
        title: `Ticket Status Changed`,
        message: `Your ticket ${ticket.ticketKey} status is now ${newStatus}`,
        data: { ticketId: ticket.id, ticketKey: ticket.ticketKey, status: newStatus },
      },
    });

    return updatedTicket;
  }

  static async updatePriority(ticketId: string, newPriority: SupportPriority) {
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw ApiError.notFound('Support ticket not found', ErrorCode.SUPPORT_TICKET_NOT_FOUND);
    }

    return prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        priority: newPriority,
        updatedAt: new Date(),
      },
    });
  }
}
