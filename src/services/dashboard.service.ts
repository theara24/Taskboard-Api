import { prisma } from '../config/prisma';
import { IssueStatus, IssuePriority } from '@prisma/client';

export class DashboardService {
  static async getMetrics(userId: string) {
    // Find project IDs accessible to this user (owned or member)
    const accessibleProjects = await prisma.project.findMany({
      where: {
        OR: [
          { ownerId: userId },
          { members: { some: { userId } } },
        ],
      },
      select: { id: true, key: true, name: true, updatedAt: true },
    });

    const projectIds = accessibleProjects.map((p) => p.id);

    if (projectIds.length === 0) {
      return {
        totalProjects: 0,
        totalIssues: 0,
        openIssues: 0,
        completedIssues: 0,
        criticalIssues: 0,
        statusCounts: {
          BACKLOG: 0,
          TODO: 0,
          IN_PROGRESS: 0,
          DONE: 0,
        },
        priorityCounts: {
          LOW: 0,
          MEDIUM: 0,
          HIGH: 0,
          CRITICAL: 0,
        },
        recentIssues: [],
        projects: [],
      };
    }

    // Run aggregations across accessible projects in parallel
    const [
      totalIssues,
      completedIssues,
      criticalIssues,
      statusGroup,
      priorityGroup,
      recentIssues,
    ] = await Promise.all([
      // Total issues
      prisma.issue.count({
        where: { projectId: { in: projectIds } },
      }),
      // Completed issues
      prisma.issue.count({
        where: { projectId: { in: projectIds }, status: IssueStatus.DONE },
      }),
      // Critical open issues
      prisma.issue.count({
        where: {
          projectId: { in: projectIds },
          priority: IssuePriority.CRITICAL,
          status: { not: IssueStatus.DONE },
        },
      }),
      // Group by status
      prisma.issue.groupBy({
        by: ['status'],
        where: { projectId: { in: projectIds } },
        _count: { status: true },
      }),
      // Group by priority
      prisma.issue.groupBy({
        by: ['priority'],
        where: { projectId: { in: projectIds } },
        _count: { priority: true },
      }),
      // Recent issues
      prisma.issue.findMany({
        where: { projectId: { in: projectIds } },
        orderBy: { updatedAt: 'desc' },
        take: 6,
        include: {
          project: { select: { id: true, key: true, name: true } },
          assignee: { select: { id: true, name: true, email: true, avatarUrl: true } },
        },
      }),
    ]);

    const statusCounts: Record<string, number> = {
      BACKLOG: 0,
      TODO: 0,
      IN_PROGRESS: 0,
      DONE: 0,
    };
    statusGroup.forEach((item) => {
      statusCounts[item.status] = item._count.status;
    });

    const priorityCounts: Record<string, number> = {
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    };
    priorityGroup.forEach((item) => {
      priorityCounts[item.priority] = item._count.priority;
    });

    return {
      totalProjects: accessibleProjects.length,
      totalIssues,
      openIssues: totalIssues - completedIssues,
      completedIssues,
      criticalIssues,
      statusCounts,
      priorityCounts,
      recentIssues,
      projects: accessibleProjects,
    };
  }
}
