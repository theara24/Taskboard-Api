import { prisma } from '../config/prisma';
import { ApiError } from '../utils/api-error';
import { ErrorCode } from '../constants/error-codes';
import {
  CreateProjectInput,
  UpdateProjectInput,
  AddProjectMemberInput,
} from '../validators/project.validator';
import { ProjectMemberRole, Role } from '@prisma/client';

export class ProjectService {
  static async createProject(userId: string, input: CreateProjectInput) {
    const key = input.key.toUpperCase();

    const existing = await prisma.project.findUnique({
      where: { key },
    });

    if (existing) {
      throw ApiError.conflict(
        `Project key "${key}" is already in use`,
        ErrorCode.PROJECT_KEY_EXISTS,
      );
    }

    return prisma.$transaction(async (tx) => {
      const project = await tx.project.create({
        data: {
          name: input.name,
          key,
          description: input.description,
          ownerId: userId,
        },
      });

      // Automatically register the owner as an OWNER in ProjectMember
      await tx.projectMember.create({
        data: {
          projectId: project.id,
          userId,
          role: ProjectMemberRole.OWNER,
        },
      });

      return project;
    });
  }

  static async listUserProjects(userId: string, role: Role) {
    // Admins see all projects; normal users see projects they own or are a member of
    if (role === Role.ADMIN) {
      return prisma.project.findMany({
        include: {
          owner: {
            select: { id: true, name: true, email: true },
          },
          _count: {
            select: { members: true, issues: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    return prisma.project.findMany({
      where: {
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        _count: {
          select: { members: true, issues: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async getProjectById(projectId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        labels: true,
        _count: {
          select: { issues: true },
        },
      },
    });

    if (!project) {
      throw ApiError.notFound('Project not found', ErrorCode.PROJECT_NOT_FOUND);
    }

    return project;
  }

  static async updateProject(projectId: string, input: UpdateProjectInput) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw ApiError.notFound('Project not found', ErrorCode.PROJECT_NOT_FOUND);
    }

    return prisma.project.update({
      where: { id: projectId },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
      },
    });
  }

  static async deleteProject(projectId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw ApiError.notFound('Project not found', ErrorCode.PROJECT_NOT_FOUND);
    }

    await prisma.project.delete({
      where: { id: projectId },
    });

    return { message: 'Project deleted successfully' };
  }

  static async listMembers(projectId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw ApiError.notFound('Project not found', ErrorCode.PROJECT_NOT_FOUND);
    }

    return prisma.projectMember.findMany({
      where: { projectId },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });
  }

  static async addMember(projectId: string, input: AddProjectMemberInput) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw ApiError.notFound('Project not found', ErrorCode.PROJECT_NOT_FOUND);
    }

    let targetUserId = input.userId;

    if (!targetUserId && input.email) {
      const user = await prisma.user.findUnique({
        where: { email: input.email.toLowerCase() },
      });
      if (!user) {
        throw ApiError.notFound(
          `User with email "${input.email}" not found`,
          ErrorCode.USER_NOT_FOUND,
        );
      }
      targetUserId = user.id;
    }

    if (!targetUserId) {
      throw ApiError.badRequest('Target user ID or email is required');
    }

    const existingMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: targetUserId,
        },
      },
    });

    if (existingMember) {
      throw ApiError.conflict(
        'User is already a member of this project',
        ErrorCode.MEMBER_ALREADY_EXISTS,
      );
    }

    return prisma.projectMember.create({
      data: {
        projectId,
        userId: targetUserId,
        role: input.role || ProjectMemberRole.MEMBER,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  static async removeMember(projectId: string, memberUserId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw ApiError.notFound('Project not found', ErrorCode.PROJECT_NOT_FOUND);
    }

    if (project.ownerId === memberUserId) {
      throw ApiError.badRequest('Cannot remove the project owner from project members');
    }

    const existing = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId: memberUserId,
        },
      },
    });

    if (!existing) {
      throw ApiError.notFound('Member not found in this project', ErrorCode.NOT_FOUND);
    }

    await prisma.projectMember.delete({
      where: {
        projectId_userId: {
          projectId,
          userId: memberUserId,
        },
      },
    });

    return { message: 'Member removed successfully' };
  }
}
