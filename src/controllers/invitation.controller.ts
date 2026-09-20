import { Request, Response, NextFunction } from 'express';
import { InvitationService } from '../services/invitation.service';
import { ApiResponse } from '../utils/api-response';
import { ApiError } from '../utils/api-error';

export class InvitationController {
  static async invite(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized();
      const { identifier, role } = req.body;
      const invitation = await InvitationService.inviteMember(
        req.params.id,
        req.user.id,
        identifier,
        role,
      );
      ApiResponse.created(res, invitation, 'Invitation sent successfully');
    } catch (error) {
      next(error);
    }
  }

  static async listByProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized();
      const invitations = await InvitationService.listProjectInvitations(
        req.params.id,
        req.user.id,
      );
      ApiResponse.success(res, invitations, 'Project invitations retrieved');
    } catch (error) {
      next(error);
    }
  }

  static async revoke(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized();
      const result = await InvitationService.revokeInvitation(
        req.params.invitationId,
        req.user.id,
      );
      ApiResponse.success(res, result, 'Invitation revoked');
    } catch (error) {
      next(error);
    }
  }

  static async accept(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized();
      const result = await InvitationService.acceptInvitation(req.params.id, req.user.id);
      ApiResponse.success(res, result, 'Invitation accepted successfully');
    } catch (error) {
      next(error);
    }
  }

  static async decline(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw ApiError.unauthorized();
      const result = await InvitationService.declineInvitation(req.params.id, req.user.id);
      ApiResponse.success(res, result, 'Invitation declined');
    } catch (error) {
      next(error);
    }
  }
}
