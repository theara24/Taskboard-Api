import { Request, Response, NextFunction } from 'express';
import { AdminService } from '../services/admin.service';
import { ApiResponse } from '../utils/api-response';
import { ApiError } from '../utils/api-error';

export class AdminController {
  static async getDashboardMetrics(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await AdminService.getDashboardMetrics();
      ApiResponse.success(res, data, 'Admin dashboard metrics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async listUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { users, pagination } = await AdminService.listUsers(req.query as any);
      ApiResponse.paginated(res, users, pagination, 'Users retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getUserDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await AdminService.getUserDetail(req.params.id);
      ApiResponse.success(res, user, 'User details retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async updateUserRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized();
      }
      const updatedUser = await AdminService.updateUserRole(
        req.params.id,
        req.body.role,
        req.user.id,
      );
      ApiResponse.success(res, updatedUser, `User system role updated to ${req.body.role}`);
    } catch (error) {
      next(error);
    }
  }

  static async listProjects(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { projects, pagination } = await AdminService.listProjects(req.query as any);
      ApiResponse.paginated(res, projects, pagination, 'Projects retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getProjectDetail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const project = await AdminService.getProjectDetail(req.params.id);
      ApiResponse.success(res, project, 'Project details retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async deleteProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized();
      }
      const result = await AdminService.deleteProject(req.params.id, req.user.id);
      ApiResponse.success(res, result, result.message);
    } catch (error) {
      next(error);
    }
  }
}
