import { prisma } from '../config/prisma';
import { ApiError } from '../utils/api-error';
import { ErrorCode } from '../constants/error-codes';

export class UserService {
  static async listUsers() {
    return prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  static async getUserById(id: string) {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw ApiError.notFound('User not found', ErrorCode.USER_NOT_FOUND);
    }

    return user;
  }
}
