import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../services/notification.service';
import { ApiResponse } from '../utils/api-response';
import { ApiError } from '../utils/api-error';

export class NotificationController {
  static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized();
      const notifications = await NotificationService.listUserNotifications(req.user.id);
      ApiResponse.success(res, notifications, 'Notifications retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized();
      const count = await NotificationService.getUnreadCount(req.user.id);
      ApiResponse.success(res, count, 'Unread notification count retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async markRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized();
      const notification = await NotificationService.markAsRead(req.params.id, req.user.id);
      ApiResponse.success(res, notification, 'Notification marked as read');
    } catch (error) {
      next(error);
    }
  }

  static async markAllRead(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized();
      const result = await NotificationService.markAllAsRead(req.user.id);
      ApiResponse.success(res, result, 'All notifications marked as read');
    } catch (error) {
      next(error);
    }
  }
}
