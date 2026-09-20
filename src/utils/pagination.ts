import { PaginationMeta } from './api-response';

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export const getPaginationParams = (
  queryPage?: unknown,
  queryLimit?: unknown,
  defaultLimit: number = 20,
  maxLimit: number = 100,
): PaginationParams => {
  const pageNumber = Math.max(1, parseInt(String(queryPage), 10) || 1);
  let limitNumber = Math.max(1, parseInt(String(queryLimit), 10) || defaultLimit);

  if (limitNumber > maxLimit) {
    limitNumber = maxLimit;
  }

  const skip = (pageNumber - 1) * limitNumber;

  return {
    page: pageNumber,
    limit: limitNumber,
    skip,
  };
};

export const buildPaginationMeta = (total: number, page: number, limit: number): PaginationMeta => {
  const totalPages = Math.ceil(total / limit) || 1;
  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};
