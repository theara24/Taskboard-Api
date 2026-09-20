import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/config/prisma';
import { createTestToken } from './helpers';

jest.mock('../src/config/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    issue: {
      findUnique: jest.fn(),
    },
    comment: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    activity: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

describe('Comment API (/api/v1/issues/:issueId/comments & /api/v1/comments)', () => {
  const authorId = '11111111-1111-1111-1111-111111111111';
  const otherUserId = '22222222-2222-2222-2222-222222222222';
  const issueId = '33333333-3333-3333-3333-333333333333';
  const commentId = '44444444-4444-4444-4444-444444444444';

  const authorToken = createTestToken(authorId);
  const otherUserToken = createTestToken(otherUserId);

  beforeEach(() => {
    jest.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma.$transaction as jest.Mock).mockImplementation(async (callback: any) => {
      return callback(prisma);
    });
  });

  describe('POST /api/v1/issues/:issueId/comments', () => {
    it('should allow user to add a comment to an issue', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: authorId,
        name: 'Alice',
        email: 'alice@example.com',
        role: 'USER',
      });
      (prisma.issue.findUnique as jest.Mock).mockResolvedValue({
        id: issueId,
        projectId: 'project-1',
      });
      (prisma.comment.create as jest.Mock).mockResolvedValue({
        id: commentId,
        content: 'This is a test comment',
        issueId,
        authorId,
        author: { id: authorId, name: 'Alice', email: 'alice@example.com' },
      });
      (prisma.activity.create as jest.Mock).mockResolvedValue({
        id: 'act-1',
      });

      const res = await request(app)
        .post(`/api/v1/issues/${issueId}/comments`)
        .set('Authorization', `Bearer ${authorToken}`)
        .send({
          content: 'This is a test comment',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.content).toBe('This is a test comment');
    });
  });

  describe('PATCH /api/v1/comments/:id (Authorization)', () => {
    it('should prevent non-author from editing another user comment', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: otherUserId,
        name: 'Bob',
        email: 'bob@example.com',
        role: 'USER',
      });
      (prisma.comment.findUnique as jest.Mock).mockResolvedValue({
        id: commentId,
        authorId: authorId, // Authored by Alice, but requested by Bob
        content: 'Original comment',
      });

      const res = await request(app)
        .patch(`/api/v1/comments/${commentId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .send({
          content: 'Attempted unauthorized edit',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('FORBIDDEN');
    });
  });
});
