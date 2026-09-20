import { Request, Response, NextFunction } from 'express';
import { SupportService } from '../services/support.service';
import { ApiResponse } from '../utils/api-response';
import { ApiError } from '../utils/api-error';
import { Role } from '@prisma/client';

export class SupportController {
  static async createTicket(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized();
      }
      const ticket = await SupportService.createTicket(req.user.id, req.body);
      ApiResponse.created(res, ticket, 'Support ticket submitted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async listUserTickets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized();
      }
      const filterUserId = req.user.role === Role.ADMIN ? undefined : req.user.id;
      const { tickets, pagination } = await SupportService.listTickets(filterUserId, req.query as any);
      ApiResponse.paginated(res, tickets, pagination, 'Support tickets retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async listAdminTickets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { tickets, pagination } = await SupportService.listTickets(undefined, req.query as any);
      ApiResponse.paginated(res, tickets, pagination, 'All support tickets retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getTicketById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized();
      }
      const ticket = await SupportService.getTicketByIdOrKey(req.params.id, req.user);
      ApiResponse.success(res, ticket, 'Support ticket details retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async addMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw ApiError.unauthorized();
      }
      const message = await SupportService.addMessage(
        req.params.id,
        req.user,
        req.body.message,
      );
      ApiResponse.created(res, message, 'Message added to support ticket');
    } catch (error) {
      next(error);
    }
  }

  static async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updatedTicket = await SupportService.updateStatus(req.params.id, req.body.status);
      ApiResponse.success(res, updatedTicket, `Support ticket status updated to ${req.body.status}`);
    } catch (error) {
      next(error);
    }
  }

  static async updatePriority(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const updatedTicket = await SupportService.updatePriority(req.params.id, req.body.priority);
      ApiResponse.success(res, updatedTicket, `Support ticket priority updated to ${req.body.priority}`);
    } catch (error) {
      next(error);
    }
  }
}
