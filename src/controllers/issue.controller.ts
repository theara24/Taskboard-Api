import { Request, Response, NextFunction } from 'express';
import { IssueService } from '../services/issue.service';
import { ApiResponse } from '../utils/api-response';
import { ApiError } from '../utils/api-error';

export class IssueController {
  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized();
      }
      const issue = await IssueService.createIssue(req.params.projectId, req.user.id, req.body);
      ApiResponse.created(res, issue, 'Issue created successfully');
    } catch (error) {
      next(error);
    }
  }

  static async listByProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { issues, pagination } = await IssueService.listIssues(req.params.projectId, req.query);
      ApiResponse.paginated(res, issues, pagination, 'Issues retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const issue = await IssueService.getIssueByIdOrKey(req.params.id);
      ApiResponse.success(res, issue, 'Issue retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized();
      }
      const issue = await IssueService.updateIssue(req.params.id, req.user.id, req.body);
      ApiResponse.success(res, issue, 'Issue updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await IssueService.deleteIssue(req.params.id);
      ApiResponse.success(res, result, 'Issue deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getActivities(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const activities = await IssueService.getIssueActivities(req.params.id);
      ApiResponse.success(res, activities, 'Issue activities retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}
