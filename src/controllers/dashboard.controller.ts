import { Request, Response, NextFunction } from 'express';
import { DashboardService } from '../services/dashboard.service';
import { ApiResponse } from '../utils/api-response';
import { ApiError } from '../utils/api-error';

export class DashboardController {
  static async getMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized();
      }
      const metrics = await DashboardService.getMetrics(req.user.id);
      ApiResponse.success(res, metrics, 'Dashboard metrics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}
