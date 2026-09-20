import jwt from 'jsonwebtoken';
import { env } from '../src/config/env';
import { Role } from '@prisma/client';

export const createTestToken = (
  userId: string,
  role: Role = Role.USER,
  email: string = 'test@example.com',
) => {
  return jwt.sign(
    {
      userId,
      role,
      email,
    },
    env.JWT_SECRET,
    { expiresIn: '1h' },
  );
};
