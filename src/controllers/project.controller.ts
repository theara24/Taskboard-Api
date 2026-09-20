import { Request, Response, NextFunction } from 'express';
import { ProjectService } from '../services/project.service';
import { ApiResponse } from '../utils/api-response';
import { ApiError } from '../utils/api-error';

export class ProjectController {
  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized();
      }
      const project = await ProjectService.createProject(req.user.id, req.body);
      ApiResponse.created(res, project, 'Project created successfully');
    } catch (error) {
      next(error);
    }
  }

  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized();
      }
      const projects = await ProjectService.listUserProjects(req.user.id, req.user.role);
      ApiResponse.success(res, projects, 'Projects retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const project = await ProjectService.getProjectById(req.params.id);
      ApiResponse.success(res, project, 'Project details retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const project = await ProjectService.updateProject(req.params.id, req.body);
      ApiResponse.success(res, project, 'Project updated successfully');
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await ProjectService.deleteProject(req.params.id);
      ApiResponse.success(res, result, 'Project deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async listMembers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const members = await ProjectService.listMembers(req.params.id);
      ApiResponse.success(res, members, 'Project members retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async addMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const member = await ProjectService.addMember(req.params.id, req.body);
      ApiResponse.created(res, member, 'Member added successfully');
    } catch (error) {
      next(error);
    }
  }

  static async removeMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await ProjectService.removeMember(req.params.id, req.params.userId);
      ApiResponse.success(res, result, 'Member removed successfully');
    } catch (error) {
      next(error);
    }
  }
}
