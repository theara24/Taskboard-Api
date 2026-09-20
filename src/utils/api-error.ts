import { ErrorCode } from '../constants/error-codes';

export class ApiError extends Error {
  public statusCode: number;
  public errorCode: string;
  public details?: unknown;

  constructor(
    statusCode: number,
    message: string,
    errorCode: string = ErrorCode.INTERNAL_SERVER_ERROR,
    details?: unknown,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  static badRequest(
    message: string,
    errorCode: string = ErrorCode.VALIDATION_ERROR,
    details?: unknown,
  ) {
    return new ApiError(400, message, errorCode, details);
  }

  static unauthorized(
    message: string = 'Unauthorized',
    errorCode: string = ErrorCode.UNAUTHORIZED,
  ) {
    return new ApiError(401, message, errorCode);
  }

  static forbidden(
    message: string = 'Forbidden: Access denied',
    errorCode: string = ErrorCode.FORBIDDEN,
  ) {
    return new ApiError(403, message, errorCode);
  }

  static notFound(message: string = 'Resource not found', errorCode: string = ErrorCode.NOT_FOUND) {
    return new ApiError(404, message, errorCode);
  }

  static conflict(message: string, errorCode: string = ErrorCode.VALIDATION_ERROR) {
    return new ApiError(409, message, errorCode);
  }

  static unprocessableEntity(
    message: string,
    errorCode: string = ErrorCode.VALIDATION_ERROR,
    details?: unknown,
  ) {
    return new ApiError(422, message, errorCode, details);
  }

  static internal(
    message: string = 'Internal Server Error',
    errorCode: string = ErrorCode.INTERNAL_SERVER_ERROR,
  ) {
    return new ApiError(500, message, errorCode);
  }
}
