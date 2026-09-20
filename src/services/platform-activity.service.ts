import { PlatformActivityType } from '@prisma/client';
import { prisma } from '../config/prisma';

export class PlatformActivityService {
  static async log(
    type: PlatformActivityType,
    message: string,
    userId?: string,
    metadata?: any,
  ) {
    try {
      if (prisma && prisma.platformActivity && prisma.platformActivity.create) {
        return await prisma.platformActivity.create({
          data: {
            type,
            message,
            userId,
            metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
          },
        });
      }
      return null;
    } catch (err) {
      console.error('Failed to log platform activity:', err);
      return null;
    }
  }

  static async getRecent(limit = 10) {
    return prisma.platformActivity.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: { select: { id: true, name: true, email: true, avatarUrl: true } },
      },
    });
  }
}
