import { Request, Response, NextFunction } from 'express';
import { LabelService } from '../services/label.service';
import { ApiResponse } from '../utils/api-response';

export class LabelController {
  static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const label = await LabelService.createLabel(req.params.projectId, req.body);
      ApiResponse.created(res, label, 'Label created successfully');
    } catch (error) {
      next(error);
    }
  }

  static async listByProject(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const labels = await LabelService.listProjectLabels(req.params.projectId);
      ApiResponse.success(res, labels, 'Labels retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async attach(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const issue = await LabelService.attachLabelToIssue(req.params.issueId, req.body);
      ApiResponse.success(res, issue, 'Label attached successfully');
    } catch (error) {
      next(error);
    }
  }

  static async detach(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await LabelService.detachLabelFromIssue(
        req.params.issueId,
        req.params.labelId,
      );
      ApiResponse.success(res, result, 'Label detached successfully');
    } catch (error) {
      next(error);
    }
  }

  static async listByIssue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const labels = await LabelService.listIssueLabels(req.params.issueId);
      ApiResponse.success(res, labels, 'Issue labels retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}
