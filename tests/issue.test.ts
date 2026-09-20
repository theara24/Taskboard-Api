import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/prisma';
import { createTestToken } from './helpers';

jest.mock('../src/config/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    project: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    issue: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    activity: {
      create: jest.fn(),
      createMany: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

describe('Issue API (/api/v1/projects/:projectId/issues & /api/v1/issues)', () => {
  const userId = '11111111-1111-1111-1111-111111111111';
  const projectId = '22222222-2222-2222-2222-222222222222';
  const token = createTestToken(userId);

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: userId,
      name: 'Alice',
      email: 'alice@example.com',
      role: 'USER',
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
      return callback(prisma);
    });
  });

  describe('POST /api/v1/projects/:projectId/issues', () => {
    it('should create an issue with an auto-generated issueKey (e.g., TASK-1)', async () => {
      // Mock project authorization check
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        id: projectId,
        ownerId: userId,
        members: [{ userId }],
        key: 'TASK',
        issueCounter: 0,
      });

      // Mock atomic project counter increment
      (prisma.project.update as jest.Mock).mockResolvedValue({
        key: 'TASK',
        issueCounter: 1,
      });

      // Mock issue creation
      (prisma.issue.create as jest.Mock).mockResolvedValue({
        id: 'issue-uuid-1',
        issueKey: 'TASK-1',
        title: 'Fix authentication vulnerability',
        type: 'BUG',
        status: 'BACKLOG',
        priority: 'CRITICAL',
        projectId,
        reporterId: userId,
        labels: [],
      });

      // Mock activity creation
      (prisma.activity.create as jest.Mock).mockResolvedValue({
        id: 'act-1',
      });

      const res = await request(app)
        .post(`/api/v1/projects/${projectId}/issues`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Fix authentication vulnerability',
          type: 'BUG',
          priority: 'CRITICAL',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.issueKey).toBe('TASK-1');
      expect(res.body.data.priority).toBe('CRITICAL');
    });
  });

  describe('GET /api/v1/projects/:projectId/issues (Filtering & Pagination)', () => {
    it('should return paginated issues with metadata', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        id: projectId,
        ownerId: userId,
        members: [{ userId }],
      });

      (prisma.issue.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'issue-1',
          issueKey: 'TASK-1',
          title: 'First Task',
          labels: [],
        },
      ]);
      (prisma.issue.count as jest.Mock).mockResolvedValue(1);

      const res = await request(app)
        .get(`/api/v1/projects/${projectId}/issues?page=1&limit=10&status=TODO&priority=HIGH`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(10);
      expect(res.body.pagination.total).toBe(1);
    });
  });
});
