import { prisma } from '../config/prisma';
import { ApiError } from '../utils/api-error';
import { ErrorCode } from '../constants/error-codes';
import { CreateIssueInput, UpdateIssueInput, ListIssuesQuery } from '../validators/issue.validator';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination';
import { Prisma } from '@prisma/client';

export class IssueService {
  static async createIssue(projectId: string, reporterId: string, input: CreateIssueInput) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw ApiError.notFound('Project not found', ErrorCode.PROJECT_NOT_FOUND);
    }

    // Verify assignee belongs to the project if assigneeId is specified
    if (input.assigneeId) {
      const isMember = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId: input.assigneeId,
          },
        },
      });

      if (!isMember && project.ownerId !== input.assigneeId) {
        throw ApiError.badRequest(
          'Assignee must be an active member of this project',
          ErrorCode.VALIDATION_ERROR,
        );
      }
    }

    return prisma.$transaction(async (tx) => {
      // 1. Atomically increment the project's issue counter to generate unique issueKey
      const updatedProject = await tx.project.update({
        where: { id: projectId },
        data: {
          issueCounter: { increment: 1 },
        },
        select: {
          key: true,
          issueCounter: true,
        },
      });

      const issueKey = `${updatedProject.key}-${updatedProject.issueCounter}`;

      // 2. Create the Issue
      const issue = await tx.issue.create({
        data: {
          issueKey,
          title: input.title,
          description: input.description,
          type: input.type,
          status: input.status,
          priority: input.priority,
          dueDate: input.dueDate ? new Date(input.dueDate) : null,
          projectId,
          reporterId,
          assigneeId: input.assigneeId,
          labels:
            input.labelIds && input.labelIds.length > 0
              ? {
                  create: input.labelIds.map((labelId) => ({
                    labelId,
                  })),
                }
              : undefined,
        },
        include: {
          reporter: { select: { id: true, name: true, email: true } },
          assignee: { select: { id: true, name: true, email: true } },
          labels: { include: { label: true } },
        },
      });

      // 3. Record Activity
      await tx.activity.create({
        data: {
          issueId: issue.id,
          userId: reporterId,
          action: 'ISSUE_CREATED',
          newValue: `Issue ${issueKey} created as ${issue.type} with priority ${issue.priority}`,
        },
      });

      return issue;
    });
  }

  static async listIssues(
    projectId?: string,
    query: ListIssuesQuery = {},
    userId?: string,
    userRole?: string,
  ) {
    if (projectId) {
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        throw ApiError.notFound('Project not found', ErrorCode.PROJECT_NOT_FOUND);
      }
    }

    const { page, limit, skip } = getPaginationParams(query.page, query.limit);

    // Build Prisma filter
    const where: Prisma.IssueWhereInput = {};

    if (projectId) {
      where.projectId = projectId;
    } else if (userId && userRole !== 'ADMIN') {
      where.project = {
        members: {
          some: { userId },
        },
      };
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.priority) {
      where.priority = query.priority;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.assigneeId) {
      where.assigneeId = query.assigneeId;
    }

    if (query.reporterId) {
      where.reporterId = query.reporterId;
    }

    const searchTerm = query.q || query.search;
    if (searchTerm) {
      where.OR = [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { issueKey: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    // Build sorting
    const orderBy: Prisma.IssueOrderByWithRelationInput = {};
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    if (sortBy === 'priority') {
      orderBy.priority = sortOrder;
    } else if (sortBy === 'dueDate') {
      orderBy.dueDate = sortOrder;
    } else if (sortBy === 'title') {
      orderBy.title = sortOrder;
    } else if (sortBy === 'updatedAt') {
      orderBy.updatedAt = sortOrder;
    } else {
      orderBy.createdAt = sortOrder;
    }

    const [issues, total] = await Promise.all([
      prisma.issue.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          reporter: { select: { id: true, name: true, email: true } },
          assignee: { select: { id: true, name: true, email: true } },
          labels: { include: { label: true } },
          _count: { select: { comments: true } },
        },
      }),
      prisma.issue.count({ where }),
    ]);

    const formattedIssues = issues.map((issue) => ({
      ...issue,
      labels: issue.labels.map((il) => il.label),
    }));

    const pagination = buildPaginationMeta(total, page, limit);

    return { issues: formattedIssues, pagination };
  }

  static async getIssueByIdOrKey(identifier: string) {
    const issue = await prisma.issue.findFirst({
      where: {
        OR: [{ id: identifier }, { issueKey: identifier.toUpperCase() }],
      },
      include: {
        project: { select: { id: true, name: true, key: true, ownerId: true } },
        reporter: { select: { id: true, name: true, email: true } },
        assignee: { select: { id: true, name: true, email: true } },
        labels: { include: { label: true } },
        comments: {
          include: {
            author: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        activities: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!issue) {
      throw ApiError.notFound('Issue not found', ErrorCode.ISSUE_NOT_FOUND);
    }

    return {
      ...issue,
      labels: issue.labels.map((il) => il.label),
    };
  }

  static async updateIssue(issueId: string, userId: string, input: UpdateIssueInput) {
    const existing = await prisma.issue.findUnique({
      where: { id: issueId },
    });

    if (!existing) {
      throw ApiError.notFound('Issue not found', ErrorCode.ISSUE_NOT_FOUND);
    }

    // Verify assignee belongs to the project if assignee is being changed
    if (input.assigneeId && input.assigneeId !== existing.assigneeId) {
      const isMember = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: existing.projectId,
            userId: input.assigneeId,
          },
        },
      });

      const project = await prisma.project.findUnique({
        where: { id: existing.projectId },
      });

      if (!isMember && project?.ownerId !== input.assigneeId) {
        throw ApiError.badRequest(
          'Assignee must be an active member of this project',
          ErrorCode.VALIDATION_ERROR,
        );
      }
    }

    return prisma.$transaction(async (tx) => {
      // Prepare activity entries
      const activitiesToCreate: Array<{
        issueId: string;
        userId: string;
        action: string;
        oldValue?: string | null;
        newValue?: string | null;
      }> = [];

      if (input.status && input.status !== existing.status) {
        activitiesToCreate.push({
          issueId,
          userId,
          action: 'STATUS_CHANGED',
          oldValue: existing.status,
          newValue: input.status,
        });
      }

      if (input.priority && input.priority !== existing.priority) {
        activitiesToCreate.push({
          issueId,
          userId,
          action: 'PRIORITY_CHANGED',
          oldValue: existing.priority,
          newValue: input.priority,
        });
      }

      if (input.type && input.type !== existing.type) {
        activitiesToCreate.push({
          issueId,
          userId,
          action: 'TYPE_CHANGED',
          oldValue: existing.type,
          newValue: input.type,
        });
      }

      if (input.assigneeId !== undefined && input.assigneeId !== existing.assigneeId) {
        activitiesToCreate.push({
          issueId,
          userId,
          action: 'ASSIGNEE_CHANGED',
          oldValue: existing.assigneeId || 'Unassigned',
          newValue: input.assigneeId || 'Unassigned',
        });
      }

      if (
        (input.title && input.title !== existing.title) ||
        (input.description !== undefined && input.description !== existing.description)
      ) {
        activitiesToCreate.push({
          issueId,
          userId,
          action: 'ISSUE_UPDATED',
          oldValue: 'Details modified',
          newValue: input.title || 'Details modified',
        });
      }

      const updated = await tx.issue.update({
        where: { id: issueId },
        data: {
          ...(input.title ? { title: input.title } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.type ? { type: input.type } : {}),
          ...(input.status ? { status: input.status } : {}),
          ...(input.priority ? { priority: input.priority } : {}),
          ...(input.assigneeId !== undefined ? { assigneeId: input.assigneeId } : {}),
          ...(input.dueDate !== undefined
            ? { dueDate: input.dueDate ? new Date(input.dueDate) : null }
            : {}),
        },
        include: {
          reporter: { select: { id: true, name: true, email: true } },
          assignee: { select: { id: true, name: true, email: true } },
          labels: { include: { label: true } },
        },
      });

      if (input.labelIds !== undefined && (tx as any).issueLabel?.deleteMany) {
        await (tx as any).issueLabel.deleteMany({ where: { issueId } });
        if (input.labelIds.length > 0) {
          await (tx as any).issueLabel.createMany({
            data: input.labelIds.map((labelId) => ({ issueId, labelId })),
          });
        }
      }

      if (activitiesToCreate.length > 0) {
        await tx.activity.createMany({
          data: activitiesToCreate,
        });
      }

      // Re-fetch or return with fresh labels
      const finalIssue = await tx.issue.findUnique({
        where: { id: issueId },
        include: {
          reporter: { select: { id: true, name: true, email: true } },
          assignee: { select: { id: true, name: true, email: true } },
          labels: { include: { label: true } },
        },
      });

      return {
        ...(finalIssue || updated),
        labels: (finalIssue || updated).labels.map((il: any) => il.label || il),
      };
    });
  }

  static async deleteIssue(issueId: string) {
    const existing = await prisma.issue.findUnique({
      where: { id: issueId },
    });

    if (!existing) {
      throw ApiError.notFound('Issue not found', ErrorCode.ISSUE_NOT_FOUND);
    }

    await prisma.issue.delete({
      where: { id: issueId },
    });

    return { message: 'Issue deleted successfully' };
  }

  static async getIssueActivities(issueId: string) {
    const existing = await prisma.issue.findUnique({
      where: { id: issueId },
    });

    if (!existing) {
      throw ApiError.notFound('Issue not found', ErrorCode.ISSUE_NOT_FOUND);
    }

    return prisma.activity.findMany({
      where: { issueId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
