import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/prisma';
import bcrypt from 'bcryptjs';

// Mock prisma client for unit/integration isolation
jest.mock('../src/config/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      findMany: jest.fn(),
    },
    $disconnect: jest.fn(),
  },
}));

describe('Authentication & User API (/api/v1/auth & /api/v1/users)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/v1/auth/register', () => {
    it('should successfully register a new user and return JWT token', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'user-uuid-1',
        name: 'Jane Doe',
        email: 'jane@example.com',
        role: 'USER',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Jane Doe',
          email: 'jane@example.com',
          password: 'securePassword123',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('User registered successfully');
      expect(res.body.data.user.email).toBe('jane@example.com');
      expect(res.body.data.token).toBeDefined();
    });

    it('should fail with 409 Conflict if email is already registered', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'existing-id',
        email: 'jane@example.com',
      });

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Jane Doe',
          email: 'jane@example.com',
          password: 'securePassword123',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('USER_ALREADY_EXISTS');
    });

    it('should fail with 400 Bad Request if validation rules fail', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'J',
          email: 'not-an-email',
          password: '123',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('VALIDATION_ERROR');
      expect(res.body.details).toBeDefined();
      expect(Array.isArray(res.body.details)).toBe(true);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should successfully log in with valid credentials and return JWT', async () => {
      const passwordHash = await bcrypt.hash('secret123', 10);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-uuid-1',
        name: 'Jane Doe',
        email: 'jane@example.com',
        passwordHash,
        role: 'USER',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'jane@example.com',
          password: 'secret123',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe('jane@example.com');
    });

    it('should fail with 401 Unauthorized for invalid password', async () => {
      const passwordHash = await bcrypt.hash('secret123', 10);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'user-uuid-1',
        name: 'Jane Doe',
        email: 'jane@example.com',
        passwordHash,
        role: 'USER',
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'jane@example.com',
          password: 'wrongPassword',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('INVALID_CREDENTIALS');
    });

    it('should fail with 401 Unauthorized when email does not exist', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'secret123',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return 401 Unauthorized when Authorization header is missing', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('UNAUTHORIZED');
    });
  });
});
