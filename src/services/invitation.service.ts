import { prisma } from '../config/prisma';
import { ApiError } from '../utils/api-error';
import { ErrorCode } from '../constants/error-codes';
import { ProjectMemberRole, NotificationType, InvitationStatus } from '@prisma/client';
import { NotificationService } from './notification.service';

export class InvitationService {
  static async inviteMember(
    projectId: string,
    inviterId: string,
    identifier: string,
    role: ProjectMemberRole = ProjectMemberRole.MEMBER,
  ) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw ApiError.notFound('Project not found', ErrorCode.PROJECT_NOT_FOUND);
    }

    if (project.ownerId !== inviterId) {
      throw ApiError.forbidden('Only the project owner can invite new members');
    }

    const inviter = await prisma.user.findUnique({
      where: { id: inviterId },
      select: { id: true, name: true, email: true },
    });

    if (!inviter) {
      throw ApiError.unauthorized('Inviter user not found');
    }

    const cleanIdentifier = identifier.trim();
    const isEmail = cleanIdentifier.includes('@');

    // 1. Locate target user by email or by name
    let targetUser = isEmail
      ? await prisma.user.findUnique({
          where: { email: cleanIdentifier.toLowerCase() },
        })
      : await prisma.user.findFirst({
          where: {
            name: { equals: cleanIdentifier, mode: 'insensitive' },
          },
        });

    if (!targetUser && !isEmail) {
      // Try partial matching if exact name match not found
      targetUser = await prisma.user.findFirst({
        where: {
          name: { contains: cleanIdentifier, mode: 'insensitive' },
        },
      });
    }

    if (!targetUser && !isEmail) {
      throw ApiError.notFound(
        `No registered user found matching username "${cleanIdentifier}". Please invite using their Google email address.`,
        ErrorCode.USER_NOT_FOUND,
      );
    }

    const targetEmail = targetUser ? targetUser.email.toLowerCase() : cleanIdentifier.toLowerCase();

    // 2. Disallow inviting project owner
    if (project.ownerId === targetUser?.id) {
      throw ApiError.badRequest('The project owner is already the leader of this project');
    }

    // 3. Disallow inviting existing members
    if (targetUser) {
      const existingMember = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId,
            userId: targetUser.id,
          },
        },
      });

      if (existingMember) {
        throw ApiError.conflict(
          `"${targetUser.name}" is already a member of this project`,
          ErrorCode.MEMBER_ALREADY_EXISTS,
        );
      }
    }

    // 4. Check for existing pending invitation
    const existingInvitation = await prisma.projectInvitation.findUnique({
      where: {
        projectId_inviteeEmail: {
          projectId,
          inviteeEmail: targetEmail,
        },
      },
    });

    if (existingInvitation && existingInvitation.status === InvitationStatus.PENDING) {
      throw ApiError.conflict(
        `A pending invitation has already been sent to ${targetEmail}`,
      );
    }

    // 5. Create or update invitation record
    const invitation = await prisma.projectInvitation.upsert({
      where: {
        projectId_inviteeEmail: {
          projectId,
          inviteeEmail: targetEmail,
        },
      },
      create: {
        projectId,
        inviterId,
        inviteeEmail: targetEmail,
        inviteeId: targetUser?.id || null,
        role,
        status: InvitationStatus.PENDING,
      },
      update: {
        inviterId,
        inviteeId: targetUser?.id || null,
        role,
        status: InvitationStatus.PENDING,
      },
      include: {
        project: { select: { id: true, name: true, key: true } },
        inviter: { select: { id: true, name: true, email: true } },
      },
    });

    // 6. If target user already has an account, send Notification
    if (targetUser) {
      await NotificationService.createNotification({
        userId: targetUser.id,
        type: NotificationType.PROJECT_INVITATION,
        title: 'Project Invitation',
        message: `${inviter.name} invited you to join "${project.name}" (${project.key}) as ${role}.`,
        data: {
          invitationId: invitation.id,
          projectId: project.id,
          projectName: project.name,
          projectKey: project.key,
          inviterName: inviter.name,
          role,
        },
      });
    }

    return invitation;
  }

  static async listProjectInvitations(projectId: string, userId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw ApiError.notFound('Project not found');
    }

    if (project.ownerId !== userId) {
      throw ApiError.forbidden('Only the project owner can view pending invitations');
    }

    return prisma.projectInvitation.findMany({
      where: {
        projectId,
        status: InvitationStatus.PENDING,
      },
      include: {
        inviter: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async revokeInvitation(invitationId: string, userId: string) {
    const invitation = await prisma.projectInvitation.findUnique({
      where: { id: invitationId },
      include: { project: true },
    });

    if (!invitation) {
      throw ApiError.notFound('Invitation not found');
    }

    if (invitation.project.ownerId !== userId) {
      throw ApiError.forbidden('Only the project owner can revoke invitations');
    }

    await prisma.projectInvitation.delete({
      where: { id: invitationId },
    });

    return { success: true, message: 'Invitation revoked successfully' };
  }

  static async acceptInvitation(invitationId: string, userId: string) {
    const invitation = await prisma.projectInvitation.findUnique({
      where: { id: invitationId },
      include: {
        project: true,
        inviter: { select: { id: true, name: true } },
      },
    });

    if (!invitation) {
      throw ApiError.notFound('Invitation not found');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw ApiError.badRequest(`This invitation has already been ${invitation.status.toLowerCase()}`);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw ApiError.unauthorized('User not found');
    }

    // Verify invitee match
    const emailMatches = user.email.toLowerCase() === invitation.inviteeEmail.toLowerCase();
    const idMatches = invitation.inviteeId === userId;

    if (!emailMatches && !idMatches) {
      throw ApiError.forbidden('This invitation was sent to a different user or email address');
    }

    // Transactionally add member and update invitation
    return prisma.$transaction(async (tx) => {
      // Create ProjectMember if not already exists
      const existingMember = await tx.projectMember.findUnique({
        where: {
          projectId_userId: {
            projectId: invitation.projectId,
            userId,
          },
        },
      });

      if (!existingMember) {
        await tx.projectMember.create({
          data: {
            projectId: invitation.projectId,
            userId,
            role: invitation.role,
          },
        });
      }

      // Mark invitation accepted
      const updatedInvitation = await tx.projectInvitation.update({
        where: { id: invitationId },
        data: {
          status: InvitationStatus.ACCEPTED,
          inviteeId: userId,
        },
      });

      // Mark related notification as read
      const notifications = await tx.notification.findMany({
        where: {
          userId,
          type: NotificationType.PROJECT_INVITATION,
          isRead: false,
        },
      });

      for (const n of notifications) {
        const payload = n.data as any;
        if (payload?.invitationId === invitationId) {
          await tx.notification.update({
            where: { id: n.id },
            data: { isRead: true },
          });
        }
      }

      // Notify inviter that invitation was accepted
      await tx.notification.create({
        data: {
          userId: invitation.inviterId,
          type: NotificationType.INVITATION_ACCEPTED,
          title: 'Invitation Accepted',
          message: `${user.name} accepted your invitation to join "${invitation.project.name}".`,
          data: {
            projectId: invitation.projectId,
            projectName: invitation.project.name,
            userId: user.id,
            userName: user.name,
          },
        },
      });

      return {
        success: true,
        project: invitation.project,
        invitation: updatedInvitation,
      };
    });
  }

  static async declineInvitation(invitationId: string, userId: string) {
    const invitation = await prisma.projectInvitation.findUnique({
      where: { id: invitationId },
      include: {
        project: true,
      },
    });

    if (!invitation) {
      throw ApiError.notFound('Invitation not found');
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw ApiError.badRequest(`This invitation has already been ${invitation.status.toLowerCase()}`);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw ApiError.unauthorized('User not found');
    }

    const emailMatches = user.email.toLowerCase() === invitation.inviteeEmail.toLowerCase();
    const idMatches = invitation.inviteeId === userId;

    if (!emailMatches && !idMatches) {
      throw ApiError.forbidden('This invitation was sent to a different user or email address');
    }

    return prisma.$transaction(async (tx) => {
      const updatedInvitation = await tx.projectInvitation.update({
        where: { id: invitationId },
        data: {
          status: InvitationStatus.DECLINED,
          inviteeId: userId,
        },
      });

      // Mark notification as read
      const notifications = await tx.notification.findMany({
        where: {
          userId,
          type: NotificationType.PROJECT_INVITATION,
          isRead: false,
        },
      });

      for (const n of notifications) {
        const payload = n.data as any;
        if (payload?.invitationId === invitationId) {
          await tx.notification.update({
            where: { id: n.id },
            data: { isRead: true },
          });
        }
      }

      // Notify inviter that invitation was declined
      await tx.notification.create({
        data: {
          userId: invitation.inviterId,
          type: NotificationType.INVITATION_DECLINED,
          title: 'Invitation Declined',
          message: `${user.name} declined the invitation to join "${invitation.project.name}".`,
          data: {
            projectId: invitation.projectId,
            projectName: invitation.project.name,
            userId: user.id,
            userName: user.name,
          },
        },
      });

      return {
        success: true,
        invitation: updatedInvitation,
      };
    });
  }
}
