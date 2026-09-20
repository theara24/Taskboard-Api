import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { ApiError } from '../utils/api-error';
import { ErrorCode } from '../constants/error-codes';
import { RegisterInput, LoginInput } from '../validators/auth.validator';
import { Role } from '@prisma/client';

export class AuthService {
  static async register(input: RegisterInput) {
    const existing = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (existing) {
      throw ApiError.conflict(
        'An account with this email already exists',
        ErrorCode.USER_ALREADY_EXISTS,
      );
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(input.password, salt);

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email.toLowerCase(),
        passwordHash,
        role: Role.USER, // Enforce single system admin policy; all registrations are regular users
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'] },
    );

    return { user, token };
  }

  static async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (!user) {
      throw ApiError.unauthorized('Invalid email or password', ErrorCode.INVALID_CREDENTIALS);
    }

    if (!user.passwordHash) {
      throw ApiError.unauthorized(
        'This account was created with Google. Please log in using Google.',
        ErrorCode.INVALID_CREDENTIALS,
      );
    }

    const isMatch = await bcrypt.compare(input.password, user.passwordHash);
    if (!isMatch) {
      throw ApiError.unauthorized('Invalid email or password', ErrorCode.INVALID_CREDENTIALS);
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'] },
    );

    const userProfile = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      provider: user.provider,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return { user: userProfile, token };
  }

  static async handleGoogleAuth(data: {
    googleId: string;
    email: string;
    name: string;
    avatarUrl?: string;
  }) {
    const normalizedEmail = data.email.toLowerCase();

    // Find existing user by googleId or email
    let user = await prisma.user.findFirst({
      where: {
        OR: [{ googleId: data.googleId }, { email: normalizedEmail }],
      },
    });

    if (user) {
      // Link Google ID and update avatar if not set
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          googleId: user.googleId || data.googleId,
          avatarUrl: user.avatarUrl || data.avatarUrl,
        },
      });
    } else {
      // Create new Google user
      user = await prisma.user.create({
        data: {
          name: data.name,
          email: normalizedEmail,
          googleId: data.googleId,
          avatarUrl: data.avatarUrl,
          provider: 'GOOGLE',
          role: Role.USER,
        },
      });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN as SignOptions['expiresIn'] },
    );

    const userProfile = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatarUrl,
      provider: user.provider,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return { user: userProfile, token };
  }

  static async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        provider: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw ApiError.notFound('User not found', ErrorCode.USER_NOT_FOUND);
    }

    return user;
  }

  static async updateProfile(userId: string, data: { name?: string; avatarUrl?: string }) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw ApiError.notFound('User not found', ErrorCode.USER_NOT_FOUND);
    }

    return prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name ? { name: data.name.trim() } : {}),
        ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl || null } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        provider: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  static async changePassword(
    userId: string,
    data: { currentPassword: string; newPassword: string },
  ) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw ApiError.notFound('User not found', ErrorCode.USER_NOT_FOUND);
    }

    if (!user.passwordHash) {
      throw ApiError.badRequest(
        'This account uses Google authentication and does not have a local password set.',
      );
    }

    const isMatch = await bcrypt.compare(data.currentPassword, user.passwordHash);
    if (!isMatch) {
      throw ApiError.badRequest('Current password does not match');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(data.newPassword, salt);

    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { message: 'Password updated successfully' };
  }
}
