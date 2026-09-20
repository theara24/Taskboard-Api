import { Role, SupportStatus, SupportPriority, IssueStatus } from '@prisma/client';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/api-error';
import { ErrorCode } from '../constants/error-codes';
import { getPaginationParams, buildPaginationMeta } from '../utils/pagination';
import { PlatformActivityService } from './platform-activity.service';

export class AdminService {
  static async getDashboardMetrics() {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      newUsersThisWeek,
      totalProjects,
      newProjectsThisWeek,
      totalIssues,
      newIssuesThisWeek,
      supportTotal,
      supportOpen,
      supportInProgress,
      supportResolved,
      supportClosed,
      supportUrgent,
      issuesBacklog,
      issuesTodo,
      issuesInProgress,
      issuesDone,
      recentActivity,
      recentTickets,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { createdAt: { gte: oneWeekAgo } } }),
      prisma.project.count(),
      prisma.project.count({ where: { createdAt: { gte: oneWeekAgo } } }),
      prisma.issue.count(),
      prisma.issue.count({ where: { createdAt: { gte: oneWeekAgo } } }),
      prisma.supportTicket.count(),
      prisma.supportTicket.count({ where: { status: SupportStatus.OPEN } }),
      prisma.supportTicket.count({ where: { status: SupportStatus.IN_PROGRESS } }),
      prisma.supportTicket.count({ where: { status: SupportStatus.RESOLVED } }),
      prisma.supportTicket.count({ where: { status: SupportStatus.CLOSED } }),
      prisma.supportTicket.count({
        where: {
          priority: SupportPriority.URGENT,
          status: { in: [SupportStatus.OPEN, SupportStatus.IN_PROGRESS] },
        },
      }),
      prisma.issue.count({ where: { status: IssueStatus.BACKLOG } }),
      prisma.issue.count({ where: { status: IssueStatus.TODO } }),
      prisma.issue.count({ where: { status: IssueStatus.IN_PROGRESS } }),
      prisma.issue.count({ where: { status: IssueStatus.DONE } }),
      PlatformActivityService.getRecent(10),
      prisma.supportTicket.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        },
      }),
    ]);

    // Build last 7 days user growth chart data
    const userGrowth: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);

      const count = await prisma.user.count({
        where: {
          createdAt: {
            gte: dayStart,
            lte: dayEnd,
          },
        },
      });

      const label = dayStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      userGrowth.push({ date: label, count });
    }

    return {
      users: {
        total: totalUsers,
        newThisWeek: newUsersThisWeek,
      },
      projects: {
        total: totalProjects,
        newThisWeek: newProjectsThisWeek,
      },
      issues: {
        total: totalIssues,
        createdThisWeek: newIssuesThisWeek,
      },
      support: {
        total: supportTotal,
        open: supportOpen,
        inProgress: supportInProgress,
        resolved: supportResolved,
        closed: supportClosed,
        urgent: supportUrgent,
      },
      issueStatusDistribution: {
        BACKLOG: issuesBacklog,
        TODO: issuesTodo,
        IN_PROGRESS: issuesInProgress,
        DONE: issuesDone,
      },
      userGrowth,
      recentActivity,
      recentTickets,
      platformHealth: {
        database: 'Connected',
        api: 'Operational',
      },
    };
  }

  static async listUsers(query: {
    page?: string;
    limit?: string;
    search?: string;
    q?: string;
    role?: Role;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const { page, limit, skip } = getPaginationParams(query.page, query.limit);

    const where: any = {};

    if (query.role) {
      where.role = query.role;
    }

    const search = query.q || query.search;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const sortField = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';

    const orderBy: any = {};
    if (sortField === 'name') orderBy.name = sortOrder;
    else if (sortField === 'email') orderBy.email = sortOrder;
    else orderBy.createdAt = sortOrder;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          provider: true,
          avatarUrl: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              ownedProjects: true,
              memberships: true,
              reportedIssues: true,
              supportTickets: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    const pagination = buildPaginationMeta(total, page, limit);

    return { users, pagination };
  }

  static async getUserDetail(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        provider: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
        ownedProjects: {
          select: { id: true, name: true, key: true, createdAt: true },
        },
        memberships: {
          include: {
            project: { select: { id: true, name: true, key: true, ownerId: true } },
          },
        },
        _count: {
          select: {
            reportedIssues: true,
            comments: true,
            supportTickets: true,
          },
        },
      },
    });

    if (!user) {
      throw ApiError.notFound('User not found', ErrorCode.USER_NOT_FOUND);
    }

    // Process project relationships clearly showing OWNER vs MEMBER
    const projectRelationships = [
      ...user.ownedProjects.map((p) => ({
        id: p.id,
        name: p.name,
        key: p.key,
        role: 'OWNER' as const,
      })),
      ...user.memberships
        .filter((m) => m.project.ownerId !== user.id)
        .map((m) => ({
          id: m.project.id,
          name: m.project.name,
          key: m.project.key,
          role: m.role,
        })),
    ];

    return {
      ...user,
      projectRelationships,
    };
  }

  static async updateUserRole(targetUserId: string, newRole: Role, adminUserId: string) {
    const targetUser = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) {
      throw ApiError.notFound('User not found', ErrorCode.USER_NOT_FOUND);
    }

    // Safety rule: Protect primary system admin account
    if (targetUser.email === 'admin@taskboard.io' && newRole !== Role.ADMIN) {
      throw ApiError.forbidden(
        'Protection Error: The primary system administrator account (admin@taskboard.io) cannot be demoted',
        ErrorCode.FORBIDDEN,
      );
    }

    const updatedUser = await prisma.user.update({
      where: { id: targetUserId },
      data: { role: newRole },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        updatedAt: true,
      },
    });

    await PlatformActivityService.log(
      'USER_ROLE_CHANGED',
      `User ${targetUser.name} (${targetUser.email}) system role changed to ${newRole}`,
      adminUserId,
      { targetUserId, oldRole: targetUser.role, newRole },
    );

    return updatedUser;
  }

  static async listProjects(query: {
    page?: string;
    limit?: string;
    search?: string;
    q?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const { page, limit, skip } = getPaginationParams(query.page, query.limit);

    const where: any = {};
    const search = query.q || query.search;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { key: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const sortField = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';
    const orderBy: any = {};
    if (sortField === 'name') orderBy.name = sortOrder;
    else if (sortField === 'key') orderBy.key = sortOrder;
    else orderBy.createdAt = sortOrder;

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          owner: { select: { id: true, name: true, email: true, avatarUrl: true } },
          _count: { select: { members: true, issues: true } },
        },
      }),
      prisma.project.count({ where }),
    ]);

    const pagination = buildPaginationMeta(total, page, limit);

    return { projects, pagination };
  }

  static async getProjectDetail(projectId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        owner: { select: { id: true, name: true, email: true, avatarUrl: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true, avatarUrl: true } },
          },
        },
        _count: {
          select: {
            issues: true,
            invitations: true,
            labels: true,
          },
        },
      },
    });

    if (!project) {
      throw ApiError.notFound('Project not found', ErrorCode.PROJECT_NOT_FOUND);
    }

    const issueStatusCounts = await prisma.issue.groupBy({
      by: ['status'],
      where: { projectId },
      _count: true,
    });

    const statusCounts = {
      BACKLOG: 0,
      TODO: 0,
      IN_PROGRESS: 0,
      DONE: 0,
    };
    issueStatusCounts.forEach((c) => {
      (statusCounts as any)[c.status] = c._count;
    });

    return {
      ...project,
      issueStatusCounts: statusCounts,
    };
  }

  static async deleteProject(projectId: string, adminUserId: string) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw ApiError.notFound('Project not found', ErrorCode.PROJECT_NOT_FOUND);
    }

    await prisma.project.delete({ where: { id: projectId } });

    await PlatformActivityService.log(
      'PROJECT_CREATED',
      `Admin deleted project "${project.name}" (${project.key})`,
      adminUserId,
      { projectId, projectKey: project.key },
    );

    return { success: true, message: `Project ${project.name} deleted successfully` };
  }
}
