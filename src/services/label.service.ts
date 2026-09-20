import { prisma } from '../config/prisma';
import { ApiError } from '../utils/api-error';
import { ErrorCode } from '../constants/error-codes';
import { CreateLabelInput, AttachLabelInput } from '../validators/label.validator';

export class LabelService {
  static async createLabel(projectId: string, input: CreateLabelInput) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw ApiError.notFound('Project not found', ErrorCode.PROJECT_NOT_FOUND);
    }

    const existing = await prisma.label.findUnique({
      where: {
        projectId_name: {
          projectId,
          name: input.name,
        },
      },
    });

    if (existing) {
      throw ApiError.conflict(
        `Label "${input.name}" already exists in this project`,
        ErrorCode.LABEL_ALREADY_EXISTS,
      );
    }

    return prisma.label.create({
      data: {
        name: input.name,
        projectId,
      },
    });
  }

  static async listProjectLabels(projectId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw ApiError.notFound('Project not found', ErrorCode.PROJECT_NOT_FOUND);
    }

    return prisma.label.findMany({
      where: { projectId },
      orderBy: { name: 'asc' },
    });
  }

  static async attachLabelToIssue(issueId: string, input: AttachLabelInput) {
    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
    });

    if (!issue) {
      throw ApiError.notFound('Issue not found', ErrorCode.ISSUE_NOT_FOUND);
    }

    const label = await prisma.label.findUnique({
      where: { id: input.labelId },
    });

    if (!label) {
      throw ApiError.notFound('Label not found', ErrorCode.LABEL_NOT_FOUND);
    }

    // Ensure label belongs to the same project as the issue
    if (label.projectId !== issue.projectId) {
      throw ApiError.badRequest('Label does not belong to the same project as this issue');
    }

    const existing = await prisma.issueLabel.findUnique({
      where: {
        issueId_labelId: {
          issueId,
          labelId: input.labelId,
        },
      },
    });

    if (existing) {
      throw ApiError.conflict(
        'Label is already attached to this issue',
        ErrorCode.VALIDATION_ERROR,
      );
    }

    await prisma.issueLabel.create({
      data: {
        issueId,
        labelId: input.labelId,
      },
    });

    return prisma.issue.findUnique({
      where: { id: issueId },
      include: {
        labels: { include: { label: true } },
      },
    });
  }

  static async detachLabelFromIssue(issueId: string, labelId: string) {
    const existing = await prisma.issueLabel.findUnique({
      where: {
        issueId_labelId: {
          issueId,
          labelId,
        },
      },
    });

    if (!existing) {
      throw ApiError.notFound('Label is not attached to this issue', ErrorCode.NOT_FOUND);
    }

    await prisma.issueLabel.delete({
      where: {
        issueId_labelId: {
          issueId,
          labelId,
        },
      },
    });

    return { message: 'Label detached successfully' };
  }

  static async listIssueLabels(issueId: string) {
    const issue = await prisma.issue.findUnique({
      where: { id: issueId },
    });

    if (!issue) {
      throw ApiError.notFound('Issue not found', ErrorCode.ISSUE_NOT_FOUND);
    }

    const issueLabels = await prisma.issueLabel.findMany({
      where: { issueId },
      include: { label: true },
    });

    return issueLabels.map((il) => il.label);
  }
}
