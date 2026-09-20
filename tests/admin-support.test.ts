import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/prisma';
import { createTestToken } from './helpers';

jest.mock('../src/config/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    project: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    issue: {
      count: jest.fn(),
    },
    supportTicket: {
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    supportTicketMessage: {
      create: jest.fn(),
    },
    platformActivity: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    notification: {
      create: jest.fn(),
      createMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

describe('Admin & Support Center API (/api/v1/admin & /api/v1/support)', () => {
  const adminId = '11111111-1111-1111-1111-111111111111';
  const userId = '22222222-2222-2222-2222-222222222222';

  const adminToken = createTestToken(adminId);
  const userToken = createTestToken(userId);

  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock user lookup
    (prisma.user.findUnique as jest.Mock).mockImplementation(({ where }: any) => {
      if (where.id === adminId) {
        return Promise.resolve({
          id: adminId,
          name: 'System Admin',
          email: 'admin@taskboard.io',
          role: 'ADMIN',
        });
      }
      if (where.id === userId) {
        return Promise.resolve({
          id: userId,
          name: 'Regular User',
          email: 'user@example.com',
          role: 'USER',
        });
      }
      return Promise.resolve(null);
    });

    (prisma.$transaction as jest.Mock).mockImplementation(async (cb: any) => cb(prisma));
  });

  describe('GET /api/v1/admin/dashboard', () => {
    it('should return 401 Unauthorized if token is missing', async () => {
      const res = await request(app).get('/api/v1/admin/dashboard');
      expect(res.status).toBe(401);
    });

    it('should return 403 Forbidden for a regular USER', async () => {
      const res = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(403);
    });

    it('should return 200 OK with metrics for ADMIN', async () => {
      (prisma.user.count as jest.Mock).mockResolvedValue(10);
      (prisma.project.count as jest.Mock).mockResolvedValue(5);
      (prisma.issue.count as jest.Mock).mockResolvedValue(40);
      (prisma.supportTicket.count as jest.Mock).mockResolvedValue(2);
      (prisma.platformActivity.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.supportTicket.findMany as jest.Mock).mockResolvedValue([]);

      const res = await request(app)
        .get('/api/v1/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.users.total).toBe(10);
      expect(res.body.data.projects.total).toBe(5);
      expect(res.body.data.issues.total).toBe(40);
      expect(res.body.data.platformHealth.database).toBe('Connected');
    });
  });

  describe('PATCH /api/v1/admin/users/:id/role', () => {
    it('should block demoting the primary admin@taskboard.io user', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: adminId,
        name: 'System Admin',
        email: 'admin@taskboard.io',
        role: 'ADMIN',
      });

      const res = await request(app)
        .patch(`/api/v1/admin/users/${adminId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'USER' });

      expect(res.status).toBe(403);
    });
  });

  describe('POST & GET /api/v1/support/tickets', () => {
    it('should allow user to submit a support ticket', async () => {
      (prisma.supportTicket.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.supportTicket.create as jest.Mock).mockResolvedValue({
        id: 'ticket-1',
        ticketNumber: 1,
        ticketKey: 'SUP-1',
        userId,
        subject: 'Cannot login',
        description: 'Google OAuth fails',
        category: 'AUTHENTICATION',
        priority: 'HIGH',
        status: 'OPEN',
      });
      (prisma.user.findMany as jest.Mock).mockResolvedValue([{ id: adminId }]);

      const res = await request(app)
        .post('/api/v1/support/tickets')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          subject: 'Cannot login',
          description: 'Google OAuth fails',
          category: 'AUTHENTICATION',
          priority: 'HIGH',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.ticketKey).toBe('SUP-1');
    });
  });
});
