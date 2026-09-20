import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/prisma';
import { createTestToken } from './helpers';

jest.mock('../src/config/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    project: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    projectMember: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

describe('Project API (/api/v1/projects)', () => {
  const userId = '11111111-1111-1111-1111-111111111111';
  const token = createTestToken(userId);

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: userId,
      name: 'Alice Owner',
      email: 'alice@example.com',
      role: 'USER',
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
      return callback(prisma);
    });
  });

  describe('POST /api/v1/projects', () => {
    it('should create a project and register the creator as OWNER', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.project.create as jest.Mock).mockResolvedValue({
        id: 'project-uuid-1',
        name: 'TaskBoard Web',
        key: 'WEB',
        ownerId: userId,
      });
      (prisma.projectMember.create as jest.Mock).mockResolvedValue({
        id: 'member-1',
        projectId: 'project-uuid-1',
        userId,
        role: 'OWNER',
      });

      const res = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'TaskBoard Web',
          key: 'WEB',
          description: 'A web platform for tasks',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.key).toBe('WEB');
    });

    it('should reject invalid project keys that are not uppercase alphanumeric', async () => {
      const res = await request(app)
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Invalid Project',
          key: 'web-app',
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/projects/:id (Authorization)', () => {
    it('should block non-members with 403 Forbidden', async () => {
      const targetProjectId = '22222222-2222-2222-2222-222222222222';
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        id: targetProjectId,
        ownerId: 'different-owner-id',
        members: [],
      });

      const res = await request(app)
        .get(`/api/v1/projects/${targetProjectId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('NOT_PROJECT_MEMBER');
    });
  });
});
