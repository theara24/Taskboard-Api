import { Request, Response, NextFunction } from 'express';
import { CommentService } from '../services/comment.service';
import { ApiResponse } from '../utils/api-response';
import { ApiError } from '../utils/api-error';

export class CommentController {
  static async add(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized();
      }
      const comment = await CommentService.addComment(req.params.issueId, req.user.id, req.body);
      ApiResponse.created(res, comment, 'Comment added successfully');
    } catch (error) {
      next(error);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const comments = await CommentService.listComments(req.params.issueId);
      ApiResponse.success(res, comments, 'Comments retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized();
      }
      const comment = await CommentService.updateComment(
        req.params.id,
        req.user.id,
        req.user.role,
        req.body,
      );
      ApiResponse.success(res, comment, 'Comment updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized();
      }
      const result = await CommentService.deleteComment(req.params.id, req.user.id, req.user.role);
      ApiResponse.success(res, result, 'Comment deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}
