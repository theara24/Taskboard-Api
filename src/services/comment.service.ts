import { prisma } from '../config/prisma';
import { ApiError } from '../utils/api-error';
import { ErrorCode } from '../constants/error-codes';
import { CreateCommentInput, UpdateCommentInput } from '../validators/comment.validator';
import { Role } from '@prisma/client';

export class CommentService {
  static async addComment(issueId: string, authorId: string, input: CreateCommentInput) {
    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
    });

    if (!issue) {
      throw ApiError.notFound('Issue not found', ErrorCode.ISSUE_NOT_FOUND);
    }

    return prisma.$transaction(async (tx) => {
      const comment = await tx.comment.create({
        data: {
          issueId,
          authorId,
          content: input.content,
        },
        include: {
          author: { select: { id: true, name: true, email: true } },
        },
      });

      // Audit activity
      await tx.activity.create({
        data: {
          issueId,
          userId: authorId,
          action: 'COMMENT_ADDED',
          newValue:
            input.content.length > 100 ? input.content.substring(0, 97) + '...' : input.content,
        },
      });

      return comment;
    });
  }

  static async listComments(issueId: string) {
    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
    });

    if (!issue) {
      throw ApiError.notFound('Issue not found', ErrorCode.ISSUE_NOT_FOUND);
    }

    return prisma.comment.findMany({
      where: { issueId },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  static async updateComment(
    commentId: string,
    userId: string,
    userRole: Role,
    input: UpdateCommentInput,
  ) {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw ApiError.notFound('Comment not found', ErrorCode.COMMENT_NOT_FOUND);
    }

    if (comment.authorId !== userId && userRole !== Role.ADMIN) {
      throw ApiError.forbidden(
        'Access denied: You can only edit your own comments',
        ErrorCode.FORBIDDEN,
      );
    }

    return prisma.comment.update({
      where: { id: commentId },
      data: {
        content: input.content,
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    });
  }

  static async deleteComment(commentId: string, userId: string, userRole: Role) {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw ApiError.notFound('Comment not found', ErrorCode.COMMENT_NOT_FOUND);
    }

    if (comment.authorId !== userId && userRole !== Role.ADMIN) {
      throw ApiError.forbidden(
        'Access denied: You can only delete your own comments',
        ErrorCode.FORBIDDEN,
      );
    }

    await prisma.comment.delete({
      where: { id: commentId },
    });

    return { message: 'Comment deleted successfully' };
  }
}
