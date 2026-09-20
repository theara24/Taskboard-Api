import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../config/prisma';
import { ApiError } from '../utils/api-error';
import { ErrorCode } from '../constants/error-codes';

export const requireProjectMember = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required', ErrorCode.UNAUTHORIZED);
    }

    // Admins bypass project-level membership checks
    if (req.user.role === Role.ADMIN) {
      return next();
    }

    const projectId = req.params.projectId || req.params.id;

    if (!projectId) {
      return next();
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          where: { userId: req.user.id },
        },
      },
    });

    if (!project) {
      throw ApiError.notFound('Project not found', ErrorCode.PROJECT_NOT_FOUND);
    }

    const isOwner = project.ownerId === req.user.id;
    const isMember = project.members.length > 0;

    if (!isOwner && !isMember) {
      throw ApiError.forbidden(
        'Access denied: You are not a member of this project',
        ErrorCode.NOT_PROJECT_MEMBER,
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

export const requireProjectOwner = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required', ErrorCode.UNAUTHORIZED);
    }

    if (req.user.role === Role.ADMIN) {
      return next();
    }

    const projectId = req.params.projectId || req.params.id;

    if (!projectId) {
      return next();
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { ownerId: true },
    });

    if (!project) {
      throw ApiError.notFound('Project not found', ErrorCode.PROJECT_NOT_FOUND);
    }

    if (project.ownerId !== req.user.id) {
      throw ApiError.forbidden(
        'Access denied: Only the project owner can perform this action',
        ErrorCode.NOT_PROJECT_OWNER,
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};
